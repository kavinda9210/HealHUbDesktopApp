import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

export type InvalidatePayload = {
  topics?: string[];
};

export function connectRealtime(accessToken: string): Socket {
  return io(API_BASE_URL, {
    transports: ['websocket', 'polling'],
    auth: { token: accessToken },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 600,
    timeout: 8000,
  });
}
