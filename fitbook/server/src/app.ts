import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import { buildRoutes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/error';

export function createApp() {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }));

  // One-off production seeding, active only while SEED_SECRET is set in the environment.
  app.post('/api/internal/seed', async (req, res) => {
    const secret = process.env.SEED_SECRET;
    if (!secret) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.header('x-seed-secret') !== secret) return res.status(403).json({ success: false, message: 'Forbidden' });
    try {
      const { runSeed } = await import('./utils/seedData');
      await runSeed();
      return res.json({ success: true, data: { seeded: true } });
    } catch (e) {
      console.error('Seed endpoint failed', e);
      return res.status(500).json({ success: false, message: 'Seed failed' });
    }
  });

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
  const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false });
  app.use('/api/auth', authLimiter);
  app.use('/api', apiLimiter, buildRoutes());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
