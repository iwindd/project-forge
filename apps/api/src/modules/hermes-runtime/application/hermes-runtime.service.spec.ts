import { describe, expect, it, vi } from 'vitest';
import { ExternalServiceError } from '../../../common/errors/application-error.js';
import type {
  HermesGatewayClientPort,
  HermesGatewayEvent,
  HermesGatewayFactory,
  HermesGatewayReady,
  HermesGatewayServerRequest,
  HermesGatewayServerRequestResponder,
  HermesProcessManagerPort,
  HermesRuntimeConfig,
  ManagedHermesProcess,
} from '../domain/hermes-runtime.types.js';
import { HermesGatewayConnectionError } from '../infrastructure/hermes-gateway.client.js';
import { HermesRuntimeService } from './hermes-runtime.service.js';

const config: HermesRuntimeConfig = {
  command: 'hermes',
  host: '127.0.0.1',
  port: 9119,
  path: '/api/ws',
  endpoint: 'ws://127.0.0.1:9119/api/ws',
  endpointConfigured: false,
  token: undefined,
  autoStart: true,
  isolated: true,
  connectTimeoutMs: 500,
  startTimeoutMs: 1_000,
};

class FakeClient implements HermesGatewayClientPort {
  private readonly events = new Set<(event: HermesGatewayEvent) => void>();
  private readonly requests = new Set<
    (request: HermesGatewayServerRequest, responder: HermesGatewayServerRequestResponder) => void
  >();

  constructor(private readonly shouldConnect = true) {}

  async connect(): Promise<HermesGatewayReady> {
    if (!this.shouldConnect) throw new HermesGatewayConnectionError('socket-error');
    return { payload: { replay_epoch: 'fixture-epoch' } };
  }

  async close(): Promise<void> {}

  async request<T>(method: string): Promise<T> {
    if (method === 'gateway.capabilities') {
      return { version: '0.21.3', capabilities: ['gateway.ping', 'session.list'] } as T;
    }
    return { ok: true } as T;
  }

  onEvent(listener: (event: HermesGatewayEvent) => void): () => void {
    this.events.add(listener);
    return () => this.events.delete(listener);
  }

  onServerRequest(
    listener: (request: HermesGatewayServerRequest, responder: HermesGatewayServerRequestResponder) => void,
  ): () => void {
    this.requests.add(listener);
    return () => this.requests.delete(listener);
  }
}

function manager(overrides: Partial<HermesProcessManagerPort> = {}): HermesProcessManagerPort {
  return {
    resolveToken: vi.fn(async () => 'managed-token'),
    detect: vi.fn(async () => ({ installed: true, compatible: true, version: '0.21.3' })),
    start: vi.fn(async () => ({ child: {} as ManagedHermesProcess['child'], token: 'managed-token' })),
    stop: vi.fn(async () => undefined),
    isRunning: vi.fn(() => false),
    ...overrides,
  };
}

describe('HermesRuntimeService', () => {
  it('reports a ready state only after the gateway handshake and capability read-back', async () => {
    const process = manager();
    const factory: HermesGatewayFactory = vi.fn(() => new FakeClient());
    const service = new HermesRuntimeService({ ...config, endpointConfigured: true }, process, factory);

    const status = await service.connect();

    expect(status).toMatchObject({
      state: 'ready',
      version: '0.21.3',
      backendEpoch: 'fixture-epoch',
      endpoint: { managed: false, host: '127.0.0.1', port: 9119, path: '/api/ws' },
    });
    expect(status.capabilities).toEqual(['gateway.ping', 'session.list']);
    expect(process.start).not.toHaveBeenCalled();
    expect(factory).toHaveBeenCalledWith({
      endpoint: config.endpoint,
      token: undefined,
      connectTimeoutMs: 500,
    });
  });

  it('starts a managed backend after an initial connection failure', async () => {
    const process = manager();
    const clients = [new FakeClient(false), new FakeClient(true)];
    const factory: HermesGatewayFactory = vi.fn(() => clients.shift() as FakeClient);
    const service = new HermesRuntimeService(config, process, factory);

    await expect(service.connect()).resolves.toMatchObject({ state: 'ready' });

    expect(process.detect).toHaveBeenCalledOnce();
    expect(process.start).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenNthCalledWith(1, {
      endpoint: config.endpoint,
      token: 'managed-token',
      connectTimeoutMs: 500,
    });
    expect(factory).toHaveBeenLastCalledWith({
      endpoint: config.endpoint,
      token: 'managed-token',
      connectTimeoutMs: 500,
    });
  });

  it('returns a distinct missing-installation error without exposing runtime credentials', async () => {
    const process = manager({
      detect: vi.fn(async () => ({ installed: false, compatible: false, version: null })),
    });
    const factory: HermesGatewayFactory = vi.fn(() => new FakeClient(false));
    const service = new HermesRuntimeService({ ...config, token: 'do-not-return-this' }, process, factory);

    await expect(service.connect()).rejects.toBeInstanceOf(ExternalServiceError);
    expect(service.getStatus()).toMatchObject({ state: 'missing', action: 'install-hermes' });
    expect(JSON.stringify(service.getStatus())).not.toContain('do-not-return-this');
  });
});
