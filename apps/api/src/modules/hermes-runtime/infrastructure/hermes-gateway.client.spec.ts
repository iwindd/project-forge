import { describe, expect, it } from 'vitest';
import { HermesGatewayClient, type HermesWebSocket, type HermesWebSocketFactory } from './hermes-gateway.client.js';

class FakeSocket implements HermesWebSocket {
  onopen: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  readonly sent: string[] = [];
  closed = false;

  constructor(readonly endpoint: string) {
    queueMicrotask(() => {
      this.onopen?.();
      this.emit({
        jsonrpc: '2.0',
        method: 'event',
        params: { type: 'gateway.ready', payload: { replay_epoch: 'epoch-1' } },
      });
    });
  }

  send(data: string): void {
    this.sent.push(data);
    const frame = JSON.parse(data) as { id: string; method: string };
    const result =
      frame.method === 'gateway.capabilities'
        ? { version: '0.21.3', capabilities: ['prompt.submit', 'session.list'] }
        : frame.method === 'session.list'
          ? { sessions: [] }
          : { ok: true };
    queueMicrotask(() => this.emit({ jsonrpc: '2.0', id: frame.id, result }));
  }

  close(): void {
    this.closed = true;
  }

  fail(): void {
    this.onerror?.(new Error('fixture offline'));
  }

  emit(frame: unknown): void {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
}

describe('HermesGatewayClient', () => {
  it('negotiates the gateway-ready frame and keeps the server token out of the base endpoint', async () => {
    let socket: FakeSocket | undefined;
    const factory: HermesWebSocketFactory = (endpoint) => {
      socket = new FakeSocket(endpoint);
      return socket;
    };
    const client = new HermesGatewayClient('ws://127.0.0.1:9119/api/ws', 'server-only-token', 500, factory);

    const ready = await client.connect();

    expect(ready.payload).toEqual({ replay_epoch: 'epoch-1' });
    expect(socket?.endpoint).toContain('token=server-only-token');
    expect(socket?.endpoint).toContain('/api/ws');

    await expect(client.request('session.list')).resolves.toEqual({ sessions: [] });
    await client.close();
    expect(socket?.closed).toBe(true);
  });

  it('rejects a failed socket without leaking an unhandled ready promise', async () => {
    let socket: FakeSocket | undefined;
    const factory: HermesWebSocketFactory = (endpoint) => {
      socket = new FakeSocket(endpoint);
      return socket;
    };
    const client = new HermesGatewayClient('ws://127.0.0.1:9119/api/ws', undefined, 500, factory);
    const connection = client.connect();

    socket?.fail();

    await expect(connection).rejects.toMatchObject({ reason: 'socket-error' });
  });

  it('routes server requests to the registered responder', async () => {
    let socket: FakeSocket | undefined;
    const factory: HermesWebSocketFactory = (endpoint) => {
      socket = new FakeSocket(endpoint);
      return socket;
    };
    const client = new HermesGatewayClient('ws://127.0.0.1:9119/api/ws', undefined, 500, factory);
    const requestSeen = new Promise<void>((resolve) => {
      client.onServerRequest((request, responder) => {
        expect(request.method).toBe('approval');
        expect(request.params).toEqual({ command: 'git status' });
        responder.result({ choice: 'once' });
        resolve();
      });
    });

    await client.connect();
    socket?.emit({ jsonrpc: '2.0', id: 'srq-1', method: 'approval', params: { command: 'git status' } });
    await requestSeen;

    expect(socket?.sent.at(-1)).toContain('"choice":"once"');
    await client.close();
  });
});
