import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ExternalServiceError } from '../../../common/errors/application-error.js';
import {
  HERMES_GATEWAY_FACTORY,
  HERMES_PROCESS_MANAGER,
  HERMES_RUNTIME_CONFIG,
  type HermesGatewayClientPort,
  type HermesGatewayEvent,
  type HermesGatewayFactory,
  type HermesGatewayReady,
  type HermesGatewayServerRequest,
  type HermesGatewayServerRequestResponder,
  type HermesInstallation,
  type HermesProcessManagerPort,
  type HermesRuntimeConfig,
  type HermesRuntimeState,
  type HermesRuntimeStatus,
} from '../domain/hermes-runtime.types.js';
import { HermesGatewayConnectionError, HermesGatewayRpcError } from '../infrastructure/hermes-gateway.client.js';
import { HermesNotInstalledError } from '../infrastructure/hermes-process.manager.js';
import { isPortReachable } from '../infrastructure/port-probe.js';

export class HermesHttpReadError extends ExternalServiceError {
  constructor(readonly httpStatus: number) {
    super(`Hermes HTTP request failed (${httpStatus})`);
  }
}

@Injectable()
export class HermesRuntimeService implements OnModuleDestroy {
  private client: HermesGatewayClientPort | null = null;
  private connectOperation: Promise<HermesRuntimeStatus> | null = null;
  private readonly eventListeners = new Set<(event: HermesGatewayEvent) => void>();
  private readonly serverRequestListeners = new Set<
    (request: HermesGatewayServerRequest, responder: HermesGatewayServerRequestResponder) => void
  >();
  private statusValue: HermesRuntimeStatus;

  constructor(
    @Inject(HERMES_RUNTIME_CONFIG) private readonly config: HermesRuntimeConfig,
    @Inject(HERMES_PROCESS_MANAGER) private readonly processManager: HermesProcessManagerPort,
    @Inject(HERMES_GATEWAY_FACTORY) private readonly gatewayFactory: HermesGatewayFactory,
  ) {
    this.statusValue = this.makeStatus('unconfigured', 'Hermes has not been connected yet', 'retry');
  }

  getStatus(): HermesRuntimeStatus {
    return {
      ...this.statusValue,
      endpoint: { ...this.statusValue.endpoint },
      capabilities: [...this.statusValue.capabilities],
    };
  }

  async connect(): Promise<HermesRuntimeStatus> {
    if (this.statusValue.state === 'ready' && this.client) return this.getStatus();
    if (this.connectOperation) return this.connectOperation;

    this.connectOperation = this.connectInternal().finally(() => {
      this.connectOperation = null;
    });
    return this.connectOperation;
  }

  async disconnect(): Promise<void> {
    const client = this.client;
    this.client = null;
    if (client) await client.close();
    this.setStatus('unconfigured', 'Hermes connection is closed', 'retry');
  }

  async request<T>(method: string, params?: unknown): Promise<T> {
    await this.connect();
    if (!this.client) throw new ExternalServiceError('Hermes gateway is not ready', { state: this.statusValue.state });
    return this.client.request<T>(method, params);
  }

  async requestHttp<T>(path: string): Promise<T> {
    await this.connect();
    const protocol = this.config.endpoint.startsWith('wss:') ? 'https:' : 'http:';
    const url = new URL(path, `${protocol}//${this.config.host}:${this.config.port}`);
    const token = this.config.endpointConfigured ? this.config.token : await this.processManager.resolveToken();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      throw new HermesHttpReadError(response.status);
    }
    return (await response.json()) as T;
  }

  onEvent(listener: (event: HermesGatewayEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  onServerRequest(
    listener: (request: HermesGatewayServerRequest, responder: HermesGatewayServerRequestResponder) => void,
  ): () => void {
    this.serverRequestListeners.add(listener);
    return () => this.serverRequestListeners.delete(listener);
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
    await this.processManager.stop();
  }

  private async connectInternal(): Promise<HermesRuntimeStatus> {
    this.setStatus('detecting', 'Checking the local Hermes runtime', 'retry');

    let gatewayToken: string | undefined;
    try {
      gatewayToken = this.config.endpointConfigured ? this.config.token : await this.processManager.resolveToken();
    } catch {
      return this.fail('unhealthy', 'Hermes gateway credentials could not be prepared', 'retry');
    }

    let firstError: unknown = null;
    try {
      const existing = await this.connectToEndpoint(this.config.endpoint, gatewayToken);
      return this.markReady(
        existing.client,
        existing.ready,
        existing.capabilities,
        existing.version,
        existing.serverRequests,
      );
    } catch (error) {
      firstError = error;
    }

    if (!this.config.autoStart || this.config.endpointConfigured) {
      return this.failFromConnection(firstError, null);
    }

    const installation = await this.processManager.detect();
    if (!installation.installed) return this.fail('missing', 'Hermes CLI was not found on this host', 'install-hermes');
    if (!installation.compatible) {
      return this.fail('incompatible', 'Hermes CLI was found, but its version could not be verified', 'install-hermes');
    }

    this.setStatus('starting', 'Starting the managed Hermes backend', 'start-hermes', installation.version);
    let managedToken: string;
    try {
      const managed = await this.processManager.start();
      managedToken = managed.token;
    } catch (error) {
      if (error instanceof HermesNotInstalledError) {
        return this.fail('missing', 'Hermes CLI was not found on this host', 'install-hermes', installation.version);
      }
      if (await isPortReachable(this.config.host, this.config.port)) {
        return this.fail(
          'port-conflict',
          'The configured Hermes port is already used by another service',
          'check-port',
        );
      }
      return this.fail('unhealthy', 'Hermes could not be started', 'start-hermes', installation.version);
    }

    try {
      const started = await this.connectToStartedEndpoint(this.config.endpoint, managedToken);
      return this.markReady(
        started.client,
        started.ready,
        started.capabilities,
        started.version ?? installation.version,
        started.serverRequests,
      );
    } catch (error) {
      const state = (await isPortReachable(this.config.host, this.config.port)) ? 'port-conflict' : 'unhealthy';
      return this.fail(
        state,
        state === 'port-conflict'
          ? 'The configured Hermes port is already used by another service'
          : 'Hermes started but did not become healthy',
        state === 'port-conflict' ? 'check-port' : 'retry',
        installation.version,
        error,
      );
    }
  }

  private async connectToStartedEndpoint(
    endpoint: string,
    token: string,
  ): Promise<Awaited<ReturnType<typeof this.connectToEndpoint>>> {
    const deadline = Date.now() + this.config.startTimeoutMs;
    let lastError: unknown;

    while (Date.now() < deadline) {
      try {
        return await this.connectToEndpoint(endpoint, token);
      } catch (error) {
        lastError = error;
        if (!(error instanceof HermesGatewayConnectionError)) throw error;
        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        await wait(Math.min(250, remaining));
      }
    }

    throw lastError ?? new HermesGatewayConnectionError('connect-timeout');
  }

  private async connectToEndpoint(
    endpoint: string,
    token: string | undefined,
  ): Promise<{
    client: HermesGatewayClientPort;
    ready: HermesGatewayReady;
    capabilities: string[];
    version: string | null;
    serverRequests: 'advertised' | 'legacy';
  }> {
    this.setStatus('connecting', 'Connecting to Hermes', 'retry');
    const client = this.gatewayFactory({ endpoint, token, connectTimeoutMs: this.config.connectTimeoutMs });
    try {
      const ready = await client.connect();
      this.setStatus('negotiating', 'Verifying Hermes capabilities', 'retry');
      let serverRequests: 'advertised' | 'legacy' = 'advertised';
      try {
        await client.request('client.capabilities', { server_requests: true });
      } catch (error) {
        if (!(error instanceof HermesGatewayRpcError) || error.rpcCode !== -32601) throw error;
        serverRequests = 'legacy';
      }
      const capabilitiesResponse = await client.request<unknown>('gateway.capabilities');
      await client.request('gateway.ping');
      return {
        client,
        ready,
        capabilities: extractCapabilities(capabilitiesResponse),
        version: extractVersion(capabilitiesResponse),
        serverRequests,
      };
    } catch (error) {
      await client.close();
      throw error;
    }
  }

  private markReady(
    client: HermesGatewayClientPort,
    ready: HermesGatewayReady,
    capabilities: string[],
    version: string | null,
    serverRequests: 'advertised' | 'legacy',
  ): HermesRuntimeStatus {
    this.client = client;
    client.onEvent((event) => {
      for (const listener of this.eventListeners) listener(event);
    });
    client.onServerRequest((request, responder) => {
      if (this.serverRequestListeners.size === 0) {
        responder.error(-32601, 'Project Forge has no handler for this Hermes request');
        return;
      }
      for (const listener of this.serverRequestListeners) listener(request, responder);
    });

    const payload = ready.payload;
    const backendEpoch =
      readString(payload, 'replay_epoch') ?? readString(payload, 'backend_epoch') ?? readString(payload, 'epoch');
    this.statusValue = this.makeStatus(
      'ready',
      'Hermes is ready',
      null,
      version,
      capabilities,
      backendEpoch,
      serverRequests,
    );
    return this.getStatus();
  }

  private failFromConnection(error: unknown, installation: HermesInstallation | null): never {
    if (installation && !installation.installed) {
      return this.fail(
        'missing',
        'Hermes CLI was not found on this host',
        'install-hermes',
        installation.version,
        error,
      );
    }
    return this.fail(
      'unhealthy',
      'Hermes is installed but the backend is not reachable',
      'retry',
      installation?.version ?? null,
      error,
    );
  }

  private fail(
    state: Exclude<
      HermesRuntimeState,
      'unconfigured' | 'detecting' | 'starting' | 'connecting' | 'negotiating' | 'ready'
    >,
    message: string,
    action: HermesRuntimeStatus['action'],
    version: string | null = null,
    cause?: unknown,
  ): never {
    this.client = null;
    this.setStatus(state, message, action, version);
    const details: Record<string, unknown> = {
      state,
      action,
      endpoint: { host: this.config.host, port: this.config.port, path: this.config.path },
    };
    if (cause instanceof HermesGatewayRpcError) details.gatewayCode = cause.rpcCode;
    throw new ExternalServiceError(message, details);
  }

  private setStatus(
    state: HermesRuntimeState,
    message: string,
    action: HermesRuntimeStatus['action'],
    version: string | null = this.statusValue.version,
    capabilities: string[] = this.statusValue.capabilities,
    backendEpoch: string | null = this.statusValue.backendEpoch,
    serverRequests: 'unknown' | 'advertised' | 'legacy' = this.statusValue.serverRequests,
  ): void {
    this.statusValue = this.makeStatus(state, message, action, version, capabilities, backendEpoch, serverRequests);
  }

  private makeStatus(
    state: HermesRuntimeState,
    message: string,
    action: HermesRuntimeStatus['action'],
    version: string | null = null,
    capabilities: string[] = [],
    backendEpoch: string | null = null,
    serverRequests: 'unknown' | 'advertised' | 'legacy' = 'unknown',
  ): HermesRuntimeStatus {
    return {
      state,
      endpoint: {
        host: this.config.host,
        port: this.config.port,
        path: this.config.path,
        managed: !this.config.endpointConfigured,
      },
      version,
      capabilities,
      backendEpoch,
      serverRequests,
      checkedAt: new Date().toISOString(),
      message,
      action,
    };
  }
}

function wait(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeoutMs));
}

function extractCapabilities(value: unknown): string[] {
  if (!isRecord(value)) return [];
  const candidates = [value.capabilities, value.methods, value.events];
  const result = new Set<string>();
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    for (const entry of candidate) {
      if (typeof entry === 'string') result.add(entry);
    }
  }
  return [...result].sort();
}

function extractVersion(value: unknown): string | null {
  if (!isRecord(value)) return null;
  return readString(value, 'version') ?? readString(value, 'gateway_version') ?? readString(value, 'backend_version');
}

function readString(value: Record<string, unknown>, key: string): string | null {
  return typeof value[key] === 'string' && value[key] ? value[key] : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
