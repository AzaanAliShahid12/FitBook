import { Request, Response } from 'express';
import { prisma } from '../config/db';
import * as bookingService from '../services/bookingService';
import { paginationParams, paginated } from '../utils/pagination';
import { forbidden, notFound } from '../utils/errors';

const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });

const bookingInclude = {
  fitnessClass: {
    include: {
      category: true,
      room: true,
      instructor: { select: { id: true, name: true, profileImage: true } },
    },
  },
  attendance: true,
} as const;

export const create = async (req: Request, res: Response) => {
  const result = await bookingService.bookClass(req.user!.id, req.body.classId);
  ok(res, result, 201);
};

export const myBookings = async (req: Request, res: Response) => {
  const { page, limit, skip } = paginationParams(req);
  const status = req.query.status as string | undefined;
  const where = { userId: req.user!.id, ...(status ? { status: status as 'CONFIRMED' | 'CANCELLED' } : {}) };
  const [data, total] = await Promise.all([
    prisma.booking.findMany({ where, include: bookingInclude, orderBy: { bookedAt: 'desc' }, skip, take: limit }),
    prisma.booking.count({ where }),
  ]);
  res.json({ success: true, ...paginated(data, total, page, limit) });
};

export const getOne = async (req: Request, res: Response) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include: bookingInclude });
  if (!booking) throw notFound('Booking not found');
  if (req.user!.role !== 'ADMIN' && booking.userId !== req.user!.id) throw forbidden();
  ok(res, booking);
};

export const cancel = async (req: Request, res: Response) => {
  const result = await bookingService.cancelBooking(
    req.user!.id,
    req.params.id,
    req.body?.reason,
    req.user!.role === 'ADMIN'
  );
  ok(res, result);
};

export const adminList = async (req: Request, res: Response) => {
  const { page, limit, skip } = paginationParams(req);
  const { search, classId, status, dateFrom, dateTo, instructorId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (classId) where.classId = classId;
  if (status) where.status = status;
  if (instructorId) where.fitnessClass = { instructorId };
  if (dateFrom || dateTo) {
    where.createdAt = { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo) } : {}) };
  }
  if (search) {
    where.OR = [
      { bookingReference: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }
  const [data, total] = await Promise.all([
    prisma.booking.findMany({
      where: where as never,
      include: {
        user: { select: { id: true, name: true, email: true, profileImage: true } },
        fitnessClass: { include: { category: true, instructor: { select: { id: true, name: true } } } },
      },
      orderBy: { bookedAt: 'desc' },
      skip, take: limit,
    }),
    prisma.booking.count({ where: where as never }),
  ]);
  res.json({ success: true, ...paginated(data, total, page, limit) });
};

// ---------- Waitlist ----------

export const joinWaitlist = async (req: Request, res: Response) => {
  const result = await bookingService.joinWaitlist(req.user!.id, req.params.classId);
  ok(res, result, 201);
};

export const leaveWaitlist = async (req: Request, res: Response) => {
  const result = await bookingService.leaveWaitlist(req.user!.id, req.params.entryId, req.user!.role === 'ADMIN');
  ok(res, result);
};

export const myWaitlist = async (req: Request, res: Response) => {
  const entries = await prisma.waitlistEntry.findMany({
    where: { userId: req.user!.id },
    include: {
      fitnessClass: {
        include: { category: true, room: true, instructor: { select: { id: true, name: true, profileImage: true } } },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });
  const withCounts = await Promise.all(
    entries.map(async (e) => {
      const totalWaiting = await prisma.waitlistEntry.count({ where: { classId: e.classId, status: 'WAITING' } });
      return { ...e, peopleAhead: e.status === 'WAITING' ? Math.max(0, e.position - 1) : 0, totalWaiting };
    })
  );
  ok(res, withCounts);
};

export const adminWaitlist = async (req: Request, res: Response) => {
  const { page, limit, skip } = paginationParams(req);
  const { classId, status } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (classId) where.classId = classId;
  if (status) where.status = status;
  const [data, total] = await Promise.all([
    prisma.waitlistEntry.findMany({
      where: where as never,
      include: {
        user: { select: { id: true, name: true, email: true, profileImage: true } },
        fitnessClass: { select: { id: true, title: true, startTime: true, capacity: true } },
      },
      orderBy: [{ joinedAt: 'desc' }],
      skip, take: limit,
    }),
    prisma.waitlistEntry.count({ where: where as never }),
  ]);
  res.json({ success: true, ...paginated(data, total, page, limit) });
};

export const adminPromote = async (req: Request, res: Response) => {
  const result = await bookingService.adminPromote(req.params.entryId, req.user!.id);
  ok(res, result);
};

export const adminRemoveEntry = async (req: Request, res: Response) => {
  const result = await bookingService.leaveWaitlist(req.user!.id, req.params.entryId, true);
  ok(res, result);
};

/** Retry promotion for a class: promotes the head of the queue if a seat is free. */
export const adminRetryPromotion = async (req: Request, res: Response) => {
  const entry = await prisma.waitlistEntry.findUnique({ where: { id: req.params.entryId } });
  if (!entry) throw notFound('Waitlist entry not found');
  const availability = await bookingService.getAvailability(entry.classId);
  if (availability.availableSeats <= 0) {
    return ok(res, { promoted: false, message: 'No seat is currently available for this class', availability });
  }
  const head = await prisma.waitlistEntry.findFirst({
    where: { classId: entry.classId, status: 'WAITING' },
    orderBy: [{ joinedAt: 'asc' }, { position: 'asc' }],
  });
  if (!head) return ok(res, { promoted: false, message: 'The waitlist is empty', availability });
  const result = await bookingService.adminPromote(head.id, req.user!.id);
  ok(res, { promoted: true, ...result });
};
