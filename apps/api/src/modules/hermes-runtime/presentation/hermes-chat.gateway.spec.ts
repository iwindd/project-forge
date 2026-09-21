import { createServer } from 'node:http';
import { once } from 'node:events';
import WebSocket from 'ws';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import type { HermesGatewayEvent } from '../domain/hermes-runtime.types.js';
import type { HermesSessionAttachment } from '../domain/hermes-session.types.js';
import { HermesChatGateway } from './hermes-chat.gateway.js';

const principal = {
  id: '550e8400-e29b-41d4-a716-446655440000',
} as AuthenticatedPrincipal;

const attachment: HermesSessionAttachment = {
  record: {
    id: '770e8400-e29b-41d4-a716-446655440000',
    userId: principal.id,
    agentHandle: 'lyla',
    hermesSessionId: 'stored-secret-id',
    createdAt: new Date('2026-09-20T10:00:00.000Z'),
    updatedAt: new Date('2026-09-20T10:00:00.000Z'),
    closedAt: null,
  },
  runtimeSessionId: 'live-secret-id',
  snapshot: {
    sessionId: '770e8400-e29b-41d4-a716-446655440000',
    agentHandle: 'lyla',
    title: 'การสนทนาแรก',
    messages: [],
    messageCount: 0,
    status: 'idle',
    inflight: null,
  },
};

describe('HermesChatGateway', () => {
  let server: ReturnType<typeof createServer> | null = null;
  let gateway: HermesChatGateway | null = null;

  afterEach(async () => {
    await gateway?.close();
    if (server) await new Promise<void>((resolve) => server?.close(() => resolve()));
    gateway = null;
    server = null;
  });

  it('authenticates the Project Forge socket, attaches a User Session, streams safe deltas, and submits text', async () => {
    let eventListener: ((event: HermesGatewayEvent) => void) | undefined;
    const runtime = {
      onEvent: vi.fn((listener: (event: HermesGatewayEvent) => void) => {
        eventListener = listener;
        return () => {
          eventListener = undefined;
        };
      }),
      request: vi.fn(async () => ({ status: 'streaming' })),
    };
    const sessions = {
      attach: vi.fn(async () => attachment),
    };
    const auth = {
      principalFromToken: vi.fn(async (token: string | undefined) => (token === 'valid-session' ? principal : null)),
    };
    gateway = new HermesChatGateway(runtime, sessions as never, auth, {
      get: <T = unknown>(key: string) =>
        (key === 'ADMIN_ORIGIN' ? 'http://127.0.0.1:5051' : undefined) as T | undefined,
    });
    server = createServer();
    gateway.attach(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not start');

    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/api/v1/hermes/chat`, {
      headers: { cookie: 'pf_session=valid-session' },
    });
    const frames: Array<Record<string, unknown>> = [];
    socket.on('message', (data) => frames.push(JSON.parse(data.toString()) as Record<string, unknown>));
    await once(socket, 'open');
    socket.send(JSON.stringify({ type: 'attach', sessionId: attachment.record.id }));
    await waitFor(() => frames.some((frame) => frame.type === 'snapshot'));

    expect(frames.find((frame) => frame.type === 'snapshot')).toEqual({
      type: 'snapshot',
      session: attachment.snapshot,
    });
    expect(JSON.stringify(frames)).not.toContain('stored-secret-id');
    expect(JSON.stringify(frames)).not.toContain('live-secret-id');

    eventListener?.({ type: 'message.delta', sessionId: 'live-secret-id', payload: { text: 'สวัสดี' } });
    await waitFor(() => frames.some((frame) => frame.type === 'assistant.delta'));
    expect(frames.find((frame) => frame.type === 'assistant.delta')).toEqual({
      type: 'assistant.delta',
      sessionId: attachment.record.id,
      text: 'สวัสดี',
    });

    eventListener?.({
      type: 'message.complete',
      sessionId: 'stored-secret-id',
      payload: { text: 'ตอบกลับแล้ว', status: 'complete' },
    });
    await waitFor(() => frames.some((frame) => frame.type === 'assistant.complete' && frame.text === 'ตอบกลับแล้ว'));
    expect(frames.find((frame) => frame.type === 'assistant.complete' && frame.text === 'ตอบกลับแล้ว')).toEqual({
      type: 'assistant.complete',
      sessionId: attachment.record.id,
      text: 'ตอบกลับแล้ว',
      status: 'complete',
      partial: false,
    });

    socket.send(JSON.stringify({ type: 'message', sessionId: attachment.record.id, text: 'ช่วยเริ่มงาน' }));
    await waitFor(() => frames.some((frame) => frame.type === 'message.accepted'));
    expect(runtime.request).toHaveBeenCalledWith('prompt.submit', {
      session_id: 'live-secret-id',
      text: 'ช่วยเริ่มงาน',
    });
    socket.close();
  });
});

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 1_000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for WebSocket frame');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
