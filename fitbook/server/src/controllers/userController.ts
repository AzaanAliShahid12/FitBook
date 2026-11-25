import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { paginationParams, paginated } from '../utils/pagination';
import { audit } from '../utils/audit';
import { badRequest, conflict, notFound } from '../utils/errors';
import { publicUser } from '../services/authService';

const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });

// ---------- Members (admin) ----------

export const listMembers = async (req: Request, res: Response) => {
  const { page, limit, skip } = paginationParams(req);
  const search = req.query.search as string | undefined;
  const where = {
    role: 'MEMBER' as const,
    ...(search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }
      : {}),
  };
  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { memberProfile: true, _count: { select: { bookings: true, waitlistEntries: true } } },
      orderBy: { createdAt: 'desc' },
      skip, take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  res.json({ success: true, ...paginated(data.map(publicUser), total, page, limit) });
};

export const getMember = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      memberProfile: true,
      bookings: { include: { fitnessClass: { select: { id: true, title: true, startTime: true } } }, orderBy: { bookedAt: 'desc' }, take: 20 },
      waitlistEntries: { include: { fitnessClass: { select: { id: true, title: true } } }, orderBy: { joinedAt: 'desc' }, take: 20 },
    },
  });
  if (!user) throw notFound('Member not found');
  ok(res, publicUser(user));
};

export const updateUser = async (req: Request, res: Response) => {
  const { bio, specialties, experienceYears, ...userFields } = req.body;
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound('User not found');
  const user = await prisma.user.update({ where: { id: req.params.id }, data: userFields });
  if (existing.role === 'INSTRUCTOR' && (bio !== undefined || specialties || experienceYears !== undefined)) {
    await prisma.instructorProfile.upsert({
      where: { userId: existing.id },
      create: { userId: existing.id, bio, specialties: specialties ?? [], experienceYears: experienceYears ?? 0 },
      update: { bio, specialties, experienceYears },
    });
  }
  await audit(req.user!.id, 'USER_UPDATED', 'User', existing.id, {});
  ok(res, publicUser(user));
};

export const deleteUser = async (req: Request, res: Response) => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound('User not found');
  // Soft-delete: deactivate so history (bookings, audit) stays consistent.
  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
  await audit(req.user!.id, 'USER_DEACTIVATED', 'User', existing.id, { email: existing.email });
  ok(res, { deactivated: true });
};

// ---------- Instructors ----------

export const listInstructors = async (_req: Request, res: Response) => {
  const instructors = await prisma.user.findMany({
    where: { role: 'INSTRUCTOR', isActive: true },
    include: { instructorProfile: true, _count: { select: { classesTeaching: true } } },
    orderBy: { name: 'asc' },
  });
  ok(res, instructors.map(publicUser));
};

export const createInstructor = async (req: Request, res: Response) => {
  const email = req.body.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict('An account with this email already exists', 'EMAIL_TAKEN');
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const user = await prisma.user.create({
    data: {
      name: req.body.name,
      email,
      passwordHash,
      phone: req.body.phone,
      profileImage: req.body.profileImage,
      role: 'INSTRUCTOR',
      emailVerified: true,
      instructorProfile: {
        create: { bio: req.body.bio, specialties: req.body.specialties ?? [], experienceYears: req.body.experienceYears ?? 0 },
      },
    },
    include: { instructorProfile: true },
  });
  await audit(req.user!.id, 'INSTRUCTOR_CREATED', 'User', user.id, { email });
  ok(res, publicUser(user), 201);
};

export const instructorClasses = async (req: Request, res: Response) => {
  const classes = await prisma.fitnessClass.findMany({
    where: { instructorId: req.params.id },
    include: { category: true, room: true },
    orderBy: { startTime: 'asc' },
  });
  ok(res, classes);
};

// ---------- Instructor self-service ----------

export const myClasses = async (req: Request, res: Response) => {
  const classes = await prisma.fitnessClass.findMany({
    where: { instructorId: req.user!.id },
    include: {
      category: true, room: true,
      _count: { select: { bookings: { where: { status: 'CONFIRMED' } }, waitlistEntries: { where: { status: 'WAITING' } } } },
    },
    orderBy: { startTime: 'asc' },
  });
  ok(res, classes);
};

export const myStats = async (req: Request, res: Response) => {
  const instructorId = req.user!.id;
  const now = new Date();
  const [totalClasses, upcoming, totalParticipants, attendanceMarked] = await Promise.all([
    prisma.fitnessClass.count({ where: { instructorId } }),
    prisma.fitnessClass.count({ where: { instructorId, startTime: { gte: now }, status: 'PUBLISHED' } }),
    prisma.booking.count({ where: { fitnessClass: { instructorId }, status: 'CONFIRMED' } }),
    prisma.attendance.count({ where: { instructorId } }),
  ]);
  ok(res, { totalClasses, upcomingClasses: upcoming, totalParticipants, attendanceMarked });
};

export const markAttendance = async (req: Request, res: Response) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.body.bookingId },
    include: { fitnessClass: true },
  });
  if (!booking) throw notFound('Booking not found');
  if (req.user!.role !== 'ADMIN' && booking.fitnessClass.instructorId !== req.user!.id) {
    throw badRequest('You can only mark attendance for your own classes', 'NOT_YOUR_CLASS');
  }
  if (booking.status !== 'CONFIRMED') throw badRequest('Attendance can only be marked for confirmed bookings', 'BOOKING_NOT_CONFIRMED');
  const record = await prisma.attendance.upsert({
    where: { bookingId: booking.id },
    create: {
      bookingId: booking.id,
      classId: booking.classId,
      userId: booking.userId,
      instructorId: req.user!.id,
      status: req.body.status,
    },
    update: { status: req.body.status, markedAt: new Date(), instructorId: req.user!.id },
  });
  await audit(req.user!.id, 'ATTENDANCE_MARKED', 'Attendance', record.id, { bookingId: booking.id, status: req.body.status });
  ok(res, record, 201);
};
