import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { verifyAccessToken } from '../utils/tokens';

let io: Server | null = null;

export interface AvailabilityPayload {
  classId: string;
  confirmedCount: number;
  availableSeats: number;
  capacity: number;
  waitlistCount: number;
}

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = verifyAccessToken(token);
      (socket as Socket & { userId?: string; role?: string }).userId = payload.sub;
      (socket as Socket & { userId?: string; role?: string }).role = payload.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const s = socket as Socket & { userId?: string; role?: string };
    if (s.userId) {
      socket.join(`user:${s.userId}`);
      if (s.role === 'ADMIN') socket.join('admins');
    }
    socket.on('class:subscribe', (classId: string) => {
      if (typeof classId === 'string' && classId.length <= 40) socket.join(`class:${classId}`);
    });
    socket.on('class:unsubscribe', (classId: string) => {
      if (typeof classId === 'string') socket.leave(`class:${classId}`);
    });
  });

  return io;
}

export function getIo() {
  return io;
}

/** Notify one specific user (their private room only). */
export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

/** Notify everyone watching a class page plus admins. Never includes private user data. */
export function emitAvailability(payload: AvailabilityPayload) {
  if (!io) return;
  io.to(`class:${payload.classId}`).emit('class:availabilityUpdated', payload);
  io.to('admins').emit('class:availabilityUpdated', payload);
}

export function emitClassEvent(classId: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(`class:${classId}`).emit(event, payload);
  io.to('admins').emit(event, payload);
}
