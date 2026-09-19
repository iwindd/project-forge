import type { ChildProcess } from 'node:child_process';

export const HERMES_RUNTIME_CONFIG = Symbol('HERMES_RUNTIME_CONFIG');
export const HERMES_PROCESS_MANAGER = Symbol('HERMES_PROCESS_MANAGER');
export const HERMES_GATEWAY_FACTORY = Symbol('HERMES_GATEWAY_FACTORY');

export type HermesRuntimeState =
  | 'unconfigured'
  | 'detecting'
  | 'starting'
  | 'connecting'
  | 'negotiating'
  | 'ready'
  | 'missing'
  | 'incompatible'
  | 'unhealthy'
  | 'port-conflict';

export type HermesRuntimeAction = 'configure' | 'install-hermes' | 'start-hermes' | 'check-port' | 'retry';

export type HermesRuntimeEndpoint = {
  host: string;
  port: number;
  path: string;
  managed: boolean;
};

export type HermesRuntimeStatus = {
  state: HermesRuntimeState;
  endpoint: HermesRuntimeEndpoint;
  version: string | null;
  capabilities: string[];
  backendEpoch: string | null;
  serverRequests: 'unknown' | 'advertised' | 'legacy';
  checkedAt: string | null;
  message: string;
  action: HermesRuntimeAction | null;
};

export type HermesRuntimeConfig = {
  command: string;
  host: string;
  port: number;
  path: string;
  endpoint: string;
  endpointConfigured: boolean;
  token: string | undefined;
  autoStart: boolean;
  isolated: boolean;
  connectTimeoutMs: number;
  startTimeoutMs: number;
};

export type HermesInstallation = {
  installed: boolean;
  compatible: boolean;
  version: string | null;
};

export type ManagedHermesProcess = {
  child: ChildProcess;
  token: string;
};

export interface HermesProcessManagerPort {
  detect(): Promise<HermesInstallation>;
  start(): Promise<ManagedHermesProcess>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

export type HermesGatewayReady = {
  payload: Record<string, unknown>;
};

export type HermesGatewayEvent = {
  type: string;
  sessionId: string | null;
  payload: unknown;
};

export type HermesGatewayServerRequest = {
  id: string | number;
  method: string;
  params: unknown;
};

export type HermesGatewayServerRequestResponder = {
  result(value: unknown): void;
  error(code: number, message: string): void;
};

export interface HermesGatewayClientPort {
  connect(): Promise<HermesGatewayReady>;
  close(): Promise<void>;
  request<T>(method: string, params?: unknown): Promise<T>;
  onEvent(listener: (event: HermesGatewayEvent) => void): () => void;
  onServerRequest(
    listener: (request: HermesGatewayServerRequest, responder: HermesGatewayServerRequestResponder) => void,
  ): () => void;
}

export type HermesGatewayFactoryOptions = {
  endpoint: string;
  token: string | undefined;
  connectTimeoutMs: number;
};

export type HermesGatewayFactory = (options: HermesGatewayFactoryOptions) => HermesGatewayClientPort;
