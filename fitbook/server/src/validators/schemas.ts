import { z } from 'zod';

const password = z.string().min(8, 'Password must be at least 8 characters').max(72);

export const registerSchema = z
  .object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password,
    confirmPassword: z.string(),
    phone: z.string().max(30).optional(),
    profileImage: z.string().url().optional().or(z.literal('')),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(10) });
export const forgotSchema = z.object({ email: z.string().email() });
export const resetSchema = z
  .object({ token: z.string().min(10), password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });
export const verifyEmailSchema = z.object({ token: z.string().min(10) });
export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1), newPassword: password, confirmPassword: z.string() })
  .refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().max(30).optional(),
  profileImage: z.string().optional(),
  goals: z.string().max(500).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().max(20).optional(),
  emergencyContact: z.string().max(60).optional(),
  bio: z.string().max(1000).optional(),
  specialties: z.array(z.string()).optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
});

const difficulty = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']);
const classStatus = z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']);

export const createClassSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional(),
  categoryId: z.string().min(1),
  instructorId: z.string().min(1),
  roomId: z.string().optional(),
  image: z.string().optional(),
  date: z.string().min(8),
  startTime: z.string().min(10),
  endTime: z.string().min(10),
  capacity: z.number().int().min(1).max(500),
  price: z.number().min(0).optional(),
  difficulty: difficulty.optional(),
  status: classStatus.optional(),
  bookingOpenAt: z.string().optional(),
  bookingCloseAt: z.string().optional(),
  cancellationDeadlineHours: z.number().int().min(0).max(168).optional(),
  waitlistEnabled: z.boolean().optional(),
  waitlistLimit: z.number().int().min(0).max(1000).optional(),
  autoPromote: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().max(30).optional(),
});

export const updateClassSchema = createClassSchema.partial();

export const createBookingSchema = z.object({ classId: z.string().min(1) });
export const cancelBookingSchema = z.object({ reason: z.string().max(300).optional() });

export const createInstructorSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password,
  phone: z.string().max(30).optional(),
  profileImage: z.string().optional(),
  bio: z.string().max(1000).optional(),
  specialties: z.array(z.string()).default([]),
  experienceYears: z.number().int().min(0).max(60).default(0),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().max(30).optional(),
  profileImage: z.string().optional(),
  isActive: z.boolean().optional(),
  bio: z.string().max(1000).optional(),
  specialties: z.array(z.string()).optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(50),
  color: z.string().max(20).optional(),
  icon: z.string().max(50).optional(),
});

export const roomSchema = z.object({
  name: z.string().min(1).max(60),
  location: z.string().max(120).optional(),
  capacity: z.number().int().min(1).max(1000).optional(),
});

export const markAttendanceSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
});
