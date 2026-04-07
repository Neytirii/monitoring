import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';

type EventHandler = (data: unknown) => void;

export function useSocket() {
  const tenant = useAuthStore((s) => s.tenant);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, EventHandler[]>>(new Map());

  useEffect(() => {
    if (!tenant) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?tenantId=${tenant.id}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.onerror = (err) => {
      console.error('WebSocket error', err);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as { type: string };
        const handlers = handlersRef.current.get(msg.type) ?? [];
        handlers.forEach((h) => h(msg));
      } catch (e) {
        console.error('Failed to parse WebSocket message', e);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
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

  return { socket: wsRef.current, on };
}
