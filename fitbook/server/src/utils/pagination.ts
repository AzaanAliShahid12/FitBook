import { Request } from 'express';

export function paginationParams(req: Request) {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '12', 10) || 12));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginated<T>(data: T[], total: number, page: number, limit: number) {
  return { data, pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}
