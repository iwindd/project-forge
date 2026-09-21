'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { hermesSessionSnapshotSchema, type HermesSessionSnapshot } from './hermes-sessions-schemas';

const wireFrameSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }).strict(),
  z.object({ type: z.literal('snapshot'), session: hermesSessionSnapshotSchema }).strict(),
  z.object({ type: z.literal('assistant.start'), sessionId: z.string().uuid() }).strict(),
  z.object({ type: z.literal('assistant.delta'), sessionId: z.string().uuid(), text: z.string() }).strict(),
  z
    .object({
      type: z.literal('assistant.complete'),
      sessionId: z.string().uuid(),
      text: z.string(),
      status: z.enum(['complete', 'error', 'interrupted']),
      partial: z.boolean(),
    })
    .strict(),
  z
    .object({
      type: z.literal('message.accepted'),
      sessionId: z.string().uuid(),
      clientMessageId: z.string().nullable(),
      status: z.string(),
    })
    .strict(),
  z.object({ type: z.literal('session.updated'), sessionId: z.string().uuid(), title: z.string() }).strict(),
  z
    .object({
      type: z.literal('error'),
      code: z.string(),
      sessionId: z.string().uuid().nullable().optional(),
      message: z.string().optional(),
    })
    .strict(),
]);

export type HermesChatFrame = z.infer<typeof wireFrameSchema>;
export type HermesChatConnectionState = 'connecting' | 'connected' | 'offline';

export function buildHermesChatUrl(apiOrigin = process.env.NEXT_PUBLIC_API_URL): string {
  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
  const browserUrl = browserOrigin ? new URL(browserOrigin) : null;
  const configuredUrl = apiOrigin ? new URL(apiOrigin, browserOrigin ?? 'http://localhost:5050') : null;
  const baseUrl =
    browserUrl &&
    configuredUrl &&
    isLoopbackHostname(configuredUrl.hostname) &&
    !isLoopbackHostname(browserUrl.hostname)
      ? browserUrl
      : (configuredUrl ?? browserUrl ?? new URL('http://localhost:5050'));

  const url = new URL(baseUrl.toString());
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/api/v1/hermes/chat';
  url.search = '';
  return url.toString();
}

function isLoopbackHostname(hostname: string): boolean {
  return new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']).has(hostname.toLowerCase());
}

type UseHermesChatOptions = {
  onFrameAction: (frame: HermesChatFrame) => void;
};

export function useHermesChat({ onFrameAction }: UseHermesChatOptions) {
  const [connectionState, setConnectionState] = useState<HermesChatConnectionState>('connecting');
  const [connectionGeneration, setConnectionGeneration] = useState(0);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);
  const onFrameRef = useRef(onFrameAction);
  const connectRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    onFrameRef.current = onFrameAction;
  }, [onFrameAction]);

  const connect = useCallback(() => {
    if (stoppedRef.current) return;
    const current = socketRef.current;
    if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) return;
    setConnectionState('connecting');
    const socket = new WebSocket(buildHermesChatUrl());
    socketRef.current = socket;
    socket.onopen = () => {
      setConnectionGeneration((current) => current + 1);
      setConnectionState('connected');
      setLastErrorCode(null);
    };
    socket.onmessage = (event) => {
      try {
        const parsed = wireFrameSchema.safeParse(JSON.parse(String(event.data)) as unknown);
        if (!parsed.success) return;
        if (parsed.data.type === 'error') setLastErrorCode(parsed.data.code);
        onFrameRef.current(parsed.data);
      } catch {
        // Ignore malformed frames. The API only emits validated frames.
      }
    };
    socket.onerror = () => setConnectionState('offline');
    socket.onclose = () => {
      if (socketRef.current === socket) socketRef.current = null;
      if (stoppedRef.current) return;
      setConnectionState('offline');
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connectRef.current();
      }, 1_000);
    };
  }, []);

  const sendFrame = useCallback((frame: Record<string, unknown>): boolean => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      if (socketRef.current === socket) setConnectionState('offline');
      return false;
    }

    try {
      socket.send(JSON.stringify(frame));
      return true;
    } catch {
      if (socketRef.current === socket) {
        socketRef.current = null;
        setConnectionState('offline');
        try {
          socket.close();
        } catch {
          // The close event will schedule the normal reconnect path.
        }
      }
      return false;
    }
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    stoppedRef.current = false;
    connect();
    return () => {
      stoppedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [connect]);

  const attach = useCallback(
    (sessionId: string) => {
      return sendFrame({ type: 'attach', sessionId });
    },
    [sendFrame],
  );

  const send = useCallback(
    (sessionId: string, text: string, clientMessageId: string) => {
      return sendFrame({ type: 'message', sessionId, text, clientMessageId });
    },
    [sendFrame],
  );

  return { connectionState, connectionGeneration, lastErrorCode, attach, send, reconnect: connect };
}

export type { HermesSessionSnapshot };
