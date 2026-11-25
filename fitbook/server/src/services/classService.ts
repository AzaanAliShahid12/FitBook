import { FitnessClass, Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { audit } from '../utils/audit';
import { badRequest, conflict, notFound } from '../utils/errors';
import { serializeClass } from '../utils/serialize';
import { emitAvailability, emitClassEvent } from '../socket';
import { classWhen, notify } from './notificationService';
import { emailTemplates } from '../utils/email';

export interface ClassInput {
  title: string;
  description?: string;
  categoryId: string;
  instructorId: string;
  roomId?: string;
  image?: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  price?: number;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
  status?: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  bookingOpenAt?: string;
  bookingCloseAt?: string;
  cancellationDeadlineHours?: number;
  waitlistEnabled?: boolean;
  waitlistLimit?: number;
  autoPromote?: boolean;
  isRecurring?: boolean;
  recurrenceRule?: string;
}

export async function countsForClasses(classIds: string[]) {
  if (classIds.length === 0) return new Map<string, { confirmedCount: number; waitlistCount: number }>();
  const [bookings, waitlist] = await Promise.all([
    prisma.booking.groupBy({ by: ['classId'], where: { classId: { in: classIds }, status: 'CONFIRMED' }, _count: { _all: true } }),
    prisma.waitlistEntry.groupBy({ by: ['classId'], where: { classId: { in: classIds }, status: 'WAITING' }, _count: { _all: true } }),
  ]);
  const map = new Map<string, { confirmedCount: number; waitlistCount: number }>();
  for (const id of classIds) map.set(id, { confirmedCount: 0, waitlistCount: 0 });
  for (const b of bookings) map.get(b.classId)!.confirmedCount = b._count._all;
  for (const w of waitlist) map.get(w.classId)!.waitlistCount = w._count._all;
  return map;
}

const classInclude = {
  category: true,
  room: true,
  instructor: { select: { id: true, name: true, email: true, profileImage: true, instructorProfile: true } },
} satisfies Prisma.FitnessClassInclude;

export interface ClassQuery {
  search?: string;
  categoryId?: string;
  instructorId?: string;
  roomId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  availability?: 'available' | 'full' | 'waitlist';
  difficulty?: string;
  sort?: string;
  page: number;
  limit: number;
  publicOnly: boolean;
}

export async function listClasses(q: ClassQuery) {
  const where: Prisma.FitnessClassWhereInput = {};
  if (q.publicOnly) where.status = 'PUBLISHED';
  else if (q.status) where.status = q.status as FitnessClass['status'];
  if (q.categoryId) where.categoryId = q.categoryId;
  if (q.instructorId) where.instructorId = q.instructorId;
  if (q.roomId) where.roomId = q.roomId;
  if (q.difficulty) where.difficulty = q.difficulty as FitnessClass['difficulty'];
  if (q.search) where.title = { contains: q.search, mode: 'insensitive' };
  if (q.date) {
    const d = new Date(q.date);
    where.date = d;
  } else if (q.dateFrom || q.dateTo) {
    where.date = {};
    if (q.dateFrom) where.date.gte = new Date(q.dateFrom);
    if (q.dateTo) where.date.lte = new Date(q.dateTo);
  }

  const orderBy: Prisma.FitnessClassOrderByWithRelationInput =
    q.sort === 'price_asc' ? { price: 'asc' }
    : q.sort === 'price_desc' ? { price: 'desc' }
    : q.sort === 'date_desc' ? { startTime: 'desc' }
    : { startTime: 'asc' };

  const all = await prisma.fitnessClass.findMany({ where, include: classInclude, orderBy });
  const counts = await countsForClasses(all.map((c) => c.id));
  let serialized = all.map((c) => ({ ...serializeClass(c, counts.get(c.id)), category: c.category, room: c.room, instructor: c.instructor }));

  if (q.availability === 'available') serialized = serialized.filter((c) => c.availableSeats > 0);
  if (q.availability === 'full') serialized = serialized.filter((c) => c.availableSeats === 0);
  if (q.availability === 'waitlist') serialized = serialized.filter((c) => c.availableSeats === 0 && c.waitlistEnabled);
  if (q.sort === 'popular') serialized.sort((a, b) => b.confirmedCount - a.confirmedCount);

  const total = serialized.length;
  const data = serialized.slice((q.page - 1) * q.limit, q.page * q.limit);
  return { data, pagination: { total, page: q.page, limit: q.limit, totalPages: Math.max(1, Math.ceil(total / q.limit)) } };
}

export async function getClassDetail(id: string) {
  const cls = await prisma.fitnessClass.findUnique({ where: { id }, include: classInclude });
  if (!cls) throw notFound('Class not found');
  const counts = await countsForClasses([id]);
  return { ...serializeClass(cls, counts.get(id)), category: cls.category, room: cls.room, instructor: cls.instructor };
}

async function assertNoConflict(instructorId: string, roomId: string | undefined, start: Date, end: Date, excludeId?: string) {
  const overlap: Prisma.FitnessClassWhereInput = {
    startTime: { lt: end },
    endTime: { gt: start },
    status: { not: 'CANCELLED' },
    ...(excludeId ? { id: { not: excludeId } } : {}),
  };
  const instructorClash = await prisma.fitnessClass.findFirst({ where: { ...overlap, instructorId } });
  if (instructorClash) throw conflict(`Instructor already teaches "${instructorClash.title}" at this time`, 'INSTRUCTOR_CONFLICT');
  if (roomId) {
    const roomClash = await prisma.fitnessClass.findFirst({ where: { ...overlap, roomId } });
    if (roomClash) throw conflict(`Room is already booked for "${roomClash.title}" at this time`, 'ROOM_CONFLICT');
  }
}

function toClassData(input: ClassInput, start: Date, end: Date, date: Date): Prisma.FitnessClassCreateInput {
  return {
    title: input.title,
    description: input.description,
    category: { connect: { id: input.categoryId } },
    instructor: { connect: { id: input.instructorId } },
    ...(input.roomId ? { room: { connect: { id: input.roomId } } } : {}),
    image: input.image,
    date,
    startTime: start,
    endTime: end,
    duration: Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000)),
    capacity: input.capacity,
    price: input.price ?? 0,
    difficulty: input.difficulty ?? 'ALL_LEVELS',
    status: input.status ?? 'PUBLISHED',
    bookingOpenAt: input.bookingOpenAt ? new Date(input.bookingOpenAt) : undefined,
    bookingCloseAt: input.bookingCloseAt ? new Date(input.bookingCloseAt) : undefined,
    cancellationDeadlineHours: input.cancellationDeadlineHours ?? 2,
    waitlistEnabled: input.waitlistEnabled ?? true,
    waitlistLimit: input.waitlistLimit ?? 50,
    autoPromote: input.autoPromote ?? true,
    isRecurring: input.isRecurring ?? false,
    recurrenceRule: input.recurrenceRule,
  };
}

export async function createClass(adminId: string, input: ClassInput) {
  const instructor = await prisma.user.findUnique({ where: { id: input.instructorId } });
  if (!instructor || instructor.role !== 'INSTRUCTOR') throw badRequest('Instructor not found', 'INSTRUCTOR_NOT_FOUND');
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) throw badRequest('Category not found', 'CATEGORY_NOT_FOUND');

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  if (end <= start) throw badRequest('End time must be after start time', 'INVALID_TIME_RANGE');
  const date = new Date(input.date);

  let occurrences = 1;
  if (input.isRecurring && input.recurrenceRule) {
    const m = /^WEEKLY:(\d{1,2})$/.exec(input.recurrenceRule.trim());
    if (m) occurrences = Math.min(52, Math.max(1, parseInt(m[1], 10)));
  }

  const created: FitnessClass[] = [];
  for (let i = 0; i < occurrences; i++) {
    const shift = i * 7 * 24 * 3600 * 1000;
    const s = new Date(start.getTime() + shift);
    const e = new Date(end.getTime() + shift);
    const d = new Date(date.getTime() + shift);
    await assertNoConflict(input.instructorId, input.roomId, s, e);
    created.push(await prisma.fitnessClass.create({ data: toClassData(input, s, e, d) }));
  }
  await audit(adminId, 'CLASS_CREATED', 'FitnessClass', created[0]?.id, { occurrences: created.length, title: input.title });
  return created;
}

export async function updateClass(adminId: string, id: string, input: Partial<ClassInput>) {
  const existing = await prisma.fitnessClass.findUnique({ where: { id } });
  if (!existing) throw notFound('Class not found');

  const start = input.startTime ? new Date(input.startTime) : existing.startTime;
  const end = input.endTime ? new Date(input.endTime) : existing.endTime;
  if (end <= start) throw badRequest('End time must be after start time', 'INVALID_TIME_RANGE');

  if (input.capacity !== undefined) {
    const confirmed = await prisma.booking.count({ where: { classId: id, status: 'CONFIRMED' } });
    if (input.capacity < confirmed) {
      throw badRequest(`Capacity cannot be lower than the ${confirmed} confirmed bookings`, 'CAPACITY_BELOW_BOOKINGS');
    }
  }
  await assertNoConflict(input.instructorId ?? existing.instructorId, input.roomId ?? existing.roomId ?? undefined, start, end, id);

  const scheduleChanged =
    start.getTime() !== existing.startTime.getTime() || end.getTime() !== existing.endTime.getTime();

  const updated = await prisma.fitnessClass.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      instructorId: input.instructorId,
      roomId: input.roomId,
      image: input.image,
      date: input.date ? new Date(input.date) : existing.date,
      startTime: start,
      endTime: end,
      duration: Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000)),
      capacity: input.capacity,
      price: input.price,
      difficulty: input.difficulty,
      status: input.status,
      bookingOpenAt: input.bookingOpenAt ? new Date(input.bookingOpenAt) : undefined,
      bookingCloseAt: input.bookingCloseAt ? new Date(input.bookingCloseAt) : undefined,
      cancellationDeadlineHours: input.cancellationDeadlineHours,
      waitlistEnabled: input.waitlistEnabled,
      waitlistLimit: input.waitlistLimit,
      autoPromote: input.autoPromote,
    },
    include: classInclude,
  });

  if (scheduleChanged) {
    const affected = await prisma.booking.findMany({ where: { classId: id, status: 'CONFIRMED' }, select: { userId: true } });
    for (const b of affected) {
      await notify({
        userId: b.userId,
        title: 'Class schedule changed',
        message: `${updated.title} has been rescheduled to ${classWhen(updated)}.`,
        type: 'CLASS_CHANGED',
        metadata: { classId: id },
      });
    }
  }
  const counts = await countsForClasses([id]);
  const c = counts.get(id)!;
  emitAvailability({ classId: id, confirmedCount: c.confirmedCount, availableSeats: Math.max(0, updated.capacity - c.confirmedCount), capacity: updated.capacity, waitlistCount: c.waitlistCount });
  emitClassEvent(id, 'class:capacityChanged', { classId: id, capacity: updated.capacity });
  await audit(adminId, 'CLASS_UPDATED', 'FitnessClass', id, { title: updated.title });
  return { ...serializeClass(updated, c), category: updated.category, room: updated.room, instructor: updated.instructor };
}

export async function deleteClass(adminId: string, id: string) {
  const existing = await prisma.fitnessClass.findUnique({ where: { id } });
  if (!existing) throw notFound('Class not found');
  const bookings = await prisma.booking.count({ where: { classId: id } });
  if (bookings > 0) throw conflict('This class has booking history and cannot be deleted. Cancel it instead.', 'CLASS_HAS_BOOKINGS');
  await prisma.fitnessClass.delete({ where: { id } });
  await audit(adminId, 'CLASS_DELETED', 'FitnessClass', id, { title: existing.title });
}

export async function cancelClass(adminId: string, id: string) {
  const existing = await prisma.fitnessClass.findUnique({ where: { id } });
  if (!existing) throw notFound('Class not found');
  if (existing.status === 'CANCELLED') throw conflict('This class is already cancelled', 'ALREADY_CANCELLED');

  const affectedBookings = await prisma.booking.findMany({
    where: { classId: id, status: 'CONFIRMED' },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const affectedWaitlist = await prisma.waitlistEntry.findMany({
    where: { classId: id, status: 'WAITING' },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  await prisma.$transaction([
    prisma.fitnessClass.update({ where: { id }, data: { status: 'CANCELLED' } }),
    prisma.booking.updateMany({
      where: { classId: id, status: 'CONFIRMED' },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Class cancelled by the studio' },
    }),
    prisma.waitlistEntry.updateMany({
      where: { classId: id, status: 'WAITING' },
      data: { status: 'EXPIRED', expiredAt: new Date() },
    }),
  ]);

  for (const b of affectedBookings) {
    await notify({
      userId: b.userId,
      title: 'Class cancelled',
      message: `${existing.title} (${classWhen(existing)}) has been cancelled by the studio. Your booking has been released.`,
      type: 'CLASS_CANCELLED',
      metadata: { classId: id },
      emailSubject: 'FitBook — Class cancelled',
      emailHtml: emailTemplates.classCancelled(b.user.name, existing.title, classWhen(existing)),
    });
  }
  for (const w of affectedWaitlist) {
    await notify({
      userId: w.userId,
      title: 'Class cancelled',
      message: `${existing.title} (${classWhen(existing)}) has been cancelled, so its waitlist has been closed.`,
      type: 'CLASS_CANCELLED',
      metadata: { classId: id },
    });
  }
  emitClassEvent(id, 'class:cancelled', { classId: id });
  emitAvailability({ classId: id, confirmedCount: 0, availableSeats: 0, capacity: existing.capacity, waitlistCount: 0 });
  await audit(adminId, 'CLASS_CANCELLED', 'FitnessClass', id, {
    title: existing.title,
    bookingsReleased: affectedBookings.length,
    waitlistExpired: affectedWaitlist.length,
  });
  return { releasedBookings: affectedBookings.length, expiredWaitlist: affectedWaitlist.length };
}
