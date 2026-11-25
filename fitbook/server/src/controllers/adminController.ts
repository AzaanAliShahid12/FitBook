import { Request, Response } from 'express';
import { prisma } from '../config/db';
import * as analytics from '../services/analyticsService';
import { audit } from '../utils/audit';
import { paginationParams, paginated } from '../utils/pagination';
import { notFound } from '../utils/errors';

const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });

export const analyticsOverview = async (_req: Request, res: Response) => {
  ok(res, await analytics.getAnalytics());
};

function csvDownload(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

export const bookingsReport = async (req: Request, res: Response) => {
  csvDownload(res, 'bookings-report.csv', await analytics.bookingsReportCsv(req.query.from as string, req.query.to as string));
};
export const waitlistReport = async (req: Request, res: Response) => {
  csvDownload(res, 'waitlist-report.csv', await analytics.waitlistReportCsv(req.query.from as string, req.query.to as string));
};
export const attendanceReport = async (req: Request, res: Response) => {
  csvDownload(res, 'attendance-report.csv', await analytics.attendanceReportCsv(req.query.from as string, req.query.to as string));
};

// ---------- Categories ----------

export const listCategories = async (_req: Request, res: Response) => {
  ok(res, await prisma.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { classes: true } } } }));
};
export const createCategory = async (req: Request, res: Response) => {
  const category = await prisma.category.create({ data: req.body });
  await audit(req.user!.id, 'CATEGORY_CREATED', 'Category', category.id, { name: category.name });
  ok(res, category, 201);
};
export const updateCategory = async (req: Request, res: Response) => {
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound('Category not found');
  ok(res, await prisma.category.update({ where: { id: req.params.id }, data: req.body }));
};
export const deleteCategory = async (req: Request, res: Response) => {
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound('Category not found');
  await prisma.category.delete({ where: { id: req.params.id } });
  await audit(req.user!.id, 'CATEGORY_DELETED', 'Category', req.params.id, { name: existing.name });
  ok(res, { deleted: true });
};

// ---------- Rooms ----------

export const listRooms = async (_req: Request, res: Response) => {
  ok(res, await prisma.room.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { classes: true } } } }));
};
export const createRoom = async (req: Request, res: Response) => {
  const room = await prisma.room.create({ data: req.body });
  await audit(req.user!.id, 'ROOM_CREATED', 'Room', room.id, { name: room.name });
  ok(res, room, 201);
};
export const updateRoom = async (req: Request, res: Response) => {
  const existing = await prisma.room.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound('Room not found');
  ok(res, await prisma.room.update({ where: { id: req.params.id }, data: req.body }));
};
export const deleteRoom = async (req: Request, res: Response) => {
  const existing = await prisma.room.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound('Room not found');
  await prisma.room.delete({ where: { id: req.params.id } });
  await audit(req.user!.id, 'ROOM_DELETED', 'Room', req.params.id, { name: existing.name });
  ok(res, { deleted: true });
};

// ---------- Audit logs ----------

export const auditLogs = async (req: Request, res: Response) => {
  const { page, limit, skip } = paginationParams(req);
  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip, take: limit,
    }),
    prisma.auditLog.count(),
  ]);
  res.json({ success: true, ...paginated(data, total, page, limit) });
};
