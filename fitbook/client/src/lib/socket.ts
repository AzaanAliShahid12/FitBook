import { io, Socket } from 'socket.io-client';
import { tokenStore } from './api';

let socket: Socket | null = null;

export function connectSocket() {
  const token = tokenStore.access;
  if (!token) return null;
  if (socket?.connected) return socket;
  socket?.disconnect();
  socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function subscribeToClass(classId: string) {
  socket?.emit('class:subscribe', classId);
}
export function unsubscribeFromClass(classId: string) {
  socket?.emit('class:unsubscribe', classId);
}
