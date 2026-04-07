import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

type EventHandler = (data: unknown) => void;

export function useSocket() {
  const tenant = useAuthStore((s) => s.tenant);
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef<Map<string, EventHandler[]>>(new Map());

  useEffect(() => {
    if (!tenant) return;

    const socket = io('/', {
      path: '/ws',
      query: { tenantId: tenant.id },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socket.onAny((event: string, data: unknown) => {
      const handlers = handlersRef.current.get(event) ?? [];
      handlers.forEach((h) => h(data));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tenant?.id]);

  const on = useCallback((event: string, handler: EventHandler) => {
    const handlers = handlersRef.current.get(event) ?? [];
    handlersRef.current.set(event, [...handlers, handler]);

    return () => {
      const current = handlersRef.current.get(event) ?? [];
      handlersRef.current.set(
        event,
        current.filter((h) => h !== handler),
      );
    };
  }, []);

  return { socket: socketRef.current, on };
}
