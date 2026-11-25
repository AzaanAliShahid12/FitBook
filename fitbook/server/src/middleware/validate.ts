import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === 'body') req.body = parsed;
      else if (source === 'query') Object.assign(req.query, parsed);
      else Object.assign(req.params, parsed);
      next();
    } catch (err) {
      next(err);
    }
  };
}
