import bcrypt from 'bcryptjs';
import { Role, User } from '@prisma/client';
import { prisma } from '../config/db';
import { env, emailEnabled } from '../config/env';
import { badRequest, conflict, unauthorized } from '../utils/errors';
import {
  randomToken,
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens';
import { sendEmail, emailTemplates } from '../utils/email';

export function publicUser(user: User) {
  const { passwordHash, ...rest } = user;
  void passwordHash;
  return rest;
}

async function issueTokens(user: User) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const refreshToken = signRefreshToken(user.id);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + env.jwtRefreshExpiresDays * 24 * 60 * 60 * 1000),
    },
  });
  return { accessToken, refreshToken };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  profileImage?: string;
}) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict('An account with this email already exists', 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash,
      phone: input.phone,
      profileImage: input.profileImage,
      role: Role.MEMBER,
      // If email is not configured (local demo), accounts are usable immediately.
      emailVerified: !emailEnabled,
      memberProfile: { create: {} },
    },
  });

  if (emailEnabled) {
    const raw = randomToken();
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
    });
    const link = `${env.clientUrl}/verify-email?token=${raw}`;
    void sendEmail(user.email, 'Verify your FitBook email', emailTemplates.verifyEmail(user.name, link));
  }

  const tokens = await issueTokens(user);
  return { user: publicUser(user), ...tokens };
}

export async function loginUser(emailInput: string, password: string) {
  const email = emailInput.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw unauthorized('Invalid email or password');
  if (!user.isActive) throw unauthorized('This account has been deactivated');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid email or password');
  const tokens = await issueTokens(user);
  return { user: publicUser(user), ...tokens };
}

export async function refreshSession(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw unauthorized('Invalid refresh token');
  }
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
  if (!stored || stored.expiresAt < new Date() || stored.userId !== payload.sub) {
    throw unauthorized('Refresh token is no longer valid');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw unauthorized('Account is not available');
  // Rotation: old refresh token is single-use.
  await prisma.refreshToken.delete({ where: { id: stored.id } });
  const tokens = await issueTokens(user);
  return { user: publicUser(user), ...tokens };
}

export async function logoutUser(refreshToken?: string) {
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { tokenHash: sha256(refreshToken) } });
  }
}

export async function forgotPassword(emailInput: string) {
  const email = emailInput.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond the same way to avoid leaking which emails exist.
  if (!user) return { devToken: undefined as string | undefined };
  const raw = randomToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 3600 * 1000) },
  });
  const link = `${env.clientUrl}/reset-password?token=${raw}`;
  void sendEmail(user.email, 'Reset your FitBook password', emailTemplates.passwordReset(user.name, link));
  return { devToken: emailEnabled ? undefined : raw };
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(rawToken) } });
  if (!stored || stored.used || stored.expiresAt < new Date()) {
    throw badRequest('This reset link is invalid or has expired', 'RESET_TOKEN_INVALID');
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: stored.id }, data: { used: true } }),
    prisma.refreshToken.deleteMany({ where: { userId: stored.userId } }),
  ]);
}

export async function verifyEmail(rawToken: string) {
  const stored = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: sha256(rawToken) } });
  if (!stored || stored.used || stored.expiresAt < new Date()) {
    throw badRequest('This verification link is invalid or has expired', 'VERIFY_TOKEN_INVALID');
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { emailVerified: true } }),
    prisma.emailVerificationToken.update({ where: { id: stored.id }, data: { used: true } }),
  ]);
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized();
  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) throw badRequest('Current password is incorrect', 'WRONG_PASSWORD');
  const passwordHash = await bcrypt.hash(next, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
  ]);
}

export async function updateProfile(
  userId: string,
  input: { name?: string; phone?: string; profileImage?: string; goals?: string; dateOfBirth?: string; gender?: string; emergencyContact?: string; bio?: string; specialties?: string[]; experienceYears?: number }
) {
  const { goals, dateOfBirth, gender, emergencyContact, bio, specialties, experienceYears, ...userFields } = input;
  const user = await prisma.user.update({ where: { id: userId }, data: userFields });
  if (user.role === Role.MEMBER && (goals !== undefined || dateOfBirth || gender || emergencyContact)) {
    await prisma.memberProfile.upsert({
      where: { userId },
      create: { userId, goals, gender, emergencyContact, dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined },
      update: { goals, gender, emergencyContact, dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined },
    });
  }
  if (user.role === Role.INSTRUCTOR && (bio !== undefined || specialties || experienceYears !== undefined)) {
    await prisma.instructorProfile.upsert({
      where: { userId },
      create: { userId, bio, specialties: specialties ?? [], experienceYears: experienceYears ?? 0 },
      update: { bio, specialties, experienceYears },
    });
  }
  return publicUser(user);
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberProfile: true, instructorProfile: true },
  });
  if (!user) throw unauthorized();
  const { passwordHash, ...rest } = user;
  void passwordHash;
  return rest;
}
