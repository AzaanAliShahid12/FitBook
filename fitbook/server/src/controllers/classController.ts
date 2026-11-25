import { Request, Response } from 'express';
import { prisma } from '../config/db';
import * as classService from '../services/classService';
import * as bookingService from '../services/bookingService';
import { paginationParams } from '../utils/pagination';
import { forbidden, notFound } from '../utils/errors';
import { serializeClass } from '../utils/serialize';

const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });

export const listPublic = async (req: Request, res: Response) => {
  const { page, limit } = paginationParams(req);
  const result = await classService.listClasses({
    search: req.query.search as string,
    categoryId: req.query.categoryId as string,
    instructorId: req.query.instructorId as string,
    roomId: req.query.roomId as string,
    date: req.query.date as string,
    dateFrom: req.query.dateFrom as string,
    dateTo: req.query.dateTo as string,
    availability: req.query.availability as 'available' | 'full' | 'waitlist',
    difficulty: req.query.difficulty as string,
    sort: req.query.sort as string,
    page, limit, publicOnly: true,
  });
  res.json({ success: true, ...result });
};

export const listAll = async (req: Request, res: Response) => {
  const { page, limit } = paginationParams(req);
  const result = await classService.listClasses({
    search: req.query.search as string,
    categoryId: req.query.categoryId as string,
    instructorId: req.query.instructorId as string,
    status: req.query.status as string,
    date: req.query.date as string,
    dateFrom: req.query.dateFrom as string,
    dateTo: req.query.dateTo as string,
    sort: req.query.sort as string,
    page, limit, publicOnly: false,
  });
  res.json({ success: true, ...result });
};

export const getOne = async (req: Request, res: Response) => {
  ok(res, await classService.getClassDetail(req.params.id));
};

export const create = async (req: Request, res: Response) => {
  const created = await classService.createClass(req.user!.id, req.body);
  const counts = await classService.countsForClasses(created.map((c) => c.id));
  ok(res, created.map((c) => serializeClass(c, counts.get(c.id))), 201);
};

export const update = async (req: Request, res: Response) => {
  ok(res, await classService.updateClass(req.user!.id, req.params.id, req.body));
};

export const remove = async (req: Request, res: Response) => {
  await classService.deleteClass(req.user!.id, req.params.id);
  ok(res, { deleted: true });
};

export const cancel = async (req: Request, res: Response) => {
  ok(res, await classService.cancelClass(req.user!.id, req.params.id));
};

export const availability = async (req: Request, res: Response) => {
  ok(res, await bookingService.getAvailability(req.params.id));
};

async function assertClassAccess(req: Request, classId: string) {
  const cls = await prisma.fitnessClass.findUnique({ where: { id: classId } });
  if (!cls) throw notFound('Class not found');
  if (req.user!.role === 'INSTRUCTOR' && cls.instructorId !== req.user!.id) {
    throw forbidden('You can only view your own classes');
  }
  return cls;
}

export const classBookings = async (req: Request, res: Response) => {
  await assertClassAccess(req, req.params.id);
  const bookings = await prisma.booking.findMany({
    where: { classId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true, profileImage: true, phone: true } }, attendance: true },
    orderBy: { bookedAt: 'desc' },
  });
  ok(res, bookings);
};

export const classWaitlist = async (req: Request, res: Response) => {
  await assertClassAccess(req, req.params.id);
  const entries = await prisma.waitlistEntry.findMany({
    where: { classId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true, profileImage: true } } },
    orderBy: [{ status: 'asc' }, { position: 'asc' }, { joinedAt: 'asc' }],
  });
  ok(res, entries);
};
