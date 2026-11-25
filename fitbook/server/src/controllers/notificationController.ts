import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { paginationParams, paginated } from '../utils/pagination';

const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });

export const list = async (req: Request, res: Response) => {
  const { page, limit, skip } = paginationParams(req);
  const where = { userId: req.user!.id };
  const [data, total, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
  ]);
  res.json({ success: true, ...paginated(data, total, page, limit), unread });
};

export const markRead = async (req: Request, res: Response) => {
  await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user!.id }, data: { isRead: true } });
  ok(res, { read: true });
};

export const markAllRead = async (req: Request, res: Response) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } });
  ok(res, { readAll: true });
};

export const remove = async (req: Request, res: Response) => {
  await prisma.notification.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
  ok(res, { deleted: true });
};
