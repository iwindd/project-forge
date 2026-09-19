import WebSocket from 'ws';
import {
  type HermesGatewayClientPort,
  type HermesGatewayEvent,
  type HermesGatewayReady,
  type HermesGatewayServerRequest,
  type HermesGatewayServerRequestResponder,
} from '../domain/hermes-runtime.types.js';

type JsonRpcId = string | number;

type JsonRpcFrame = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

type WebSocketMessage = { data: unknown };

export type HermesWebSocket = {
  onopen: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: WebSocketMessage) => void) | null;
  onclose: ((event: unknown) => void) | null;
  send(data: string): void;
  close(): void;
};

export type HermesWebSocketFactory = (endpoint: string) => HermesWebSocket;

export class HermesGatewayRpcError extends Error {
  constructor(
    readonly rpcCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HermesGatewayRpcError';
  }
}

export class HermesGatewayConnectionError extends Error {
  constructor(readonly reason: 'websocket-unavailable' | 'connect-timeout' | 'gateway-ready-timeout' | 'socket-error') {
    super(`Hermes gateway connection failed: ${reason}`);
    this.name = 'HermesGatewayConnectionError';
  }
}

export function appendHermesToken(endpoint: string, token: string | undefined): string {
  if (!token) return endpoint;
  const url = new URL(endpoint);
  url.searchParams.set('token', token);
  return url.toString();
}

function defaultWebSocketFactory(endpoint: string): HermesWebSocket {
  return new WebSocket(endpoint) as unknown as HermesWebSocket;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function frameIdKey(id: JsonRpcId): string {
  return `${typeof id}:${String(id)}`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeout: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new HermesGatewayConnectionError('connect-timeout'));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export class HermesGatewayClient implements HermesGatewayClientPort {
  private socket: HermesWebSocket | null = null;
  private ready: HermesGatewayReady | null = null;
  private connecting: Promise<HermesGatewayReady> | null = null;
  private requestCounter = 0;
  private readonly pending = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: unknown) => void; timer: ReturnType<typeof setTimeout> }
  >();
  private readonly eventListeners = new Set<(event: HermesGatewayEvent) => void>();
  private readonly serverRequestListeners = new Set<
    (request: HermesGatewayServerRequest, responder: HermesGatewayServerRequestResponder) => void
  >();

  constructor(
    private readonly endpoint: string,
    private readonly token: string | undefined,
    private readonly connectTimeoutMs: number,
    private readonly webSocketFactory: HermesWebSocketFactory = defaultWebSocketFactory,
  ) {}

  async connect(): Promise<HermesGatewayReady> {
    if (this.ready) return this.ready;
    if (this.connecting) return this.connecting;

    this.connecting = this.open().finally(() => {
      this.connecting = null;
    });

    try {
      this.ready = await this.connecting;
      return this.ready;
    } catch (error) {
      this.connecting = null;
      await this.close();
      throw error;
    }
  }

  async close(): Promise<void> {
    const socket = this.socket;
    this.socket = null;
    this.ready = null;

    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new HermesGatewayConnectionError('socket-error'));
    }
    this.pending.clear();

    if (socket) {
      socket.onopen = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.close();
    }
  }

  request<T>(method: string, params?: unknown): Promise<T> {
    const socket = this.socket;
    if (!socket || !this.ready) {
      return Promise.reject(new HermesGatewayConnectionError('socket-error'));
    }

    const id = `project-forge-${++this.requestCounter}`;
    const frame: JsonRpcFrame = { jsonrpc: '2.0', id, method };
    if (params !== undefined) frame.params = params;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => {
          this.pending.delete(frameIdKey(id));
          reject(new HermesGatewayConnectionError('socket-error'));
        },
        Math.max(this.connectTimeoutMs, 5000),
      );
      this.pending.set(frameIdKey(id), { resolve: resolve as (value: unknown) => void, reject, timer });

      try {
        socket.send(JSON.stringify(frame));
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(frameIdKey(id));
        reject(error);
      }
    });
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

  private async open(): Promise<HermesGatewayReady> {
    let socket: HermesWebSocket;
    socket = this.webSocketFactory(appendHermesToken(this.endpoint, this.token));

    this.socket = socket;
    let opened = false;
    let openResolve: () => void;
    let openReject: (error: unknown) => void;
    let readyResolve: (ready: HermesGatewayReady) => void;
    let readyReject: (error: unknown) => void;

    const openPromise = new Promise<void>((resolve, reject) => {
      openResolve = resolve;
      openReject = reject;
    });
    const readyPromise = new Promise<HermesGatewayReady>((resolve, reject) => {
      readyResolve = resolve;
      readyReject = reject;
    });
    void readyPromise.catch(() => undefined);

    socket.onopen = () => {
      opened = true;
      openResolve();
    };
    socket.onerror = () => {
      const error = new HermesGatewayConnectionError('socket-error');
      if (!opened) openReject(error);
      readyReject(error);
      this.rejectPending(error);
    };
    socket.onclose = () => {
      const error = new HermesGatewayConnectionError('socket-error');
      if (!opened) openReject(error);
      readyReject(error);
      this.rejectPending(error);
      if (this.socket === socket) this.socket = null;
    };
    socket.onmessage = (event) => {
      this.handleFrame(event.data, readyResolve, readyReject);
    };

    await withTimeout(openPromise, this.connectTimeoutMs, () => socket.close());
    return withTimeout(readyPromise, this.connectTimeoutMs, () => socket.close()).catch((error: unknown) => {
      if (error instanceof HermesGatewayConnectionError && error.reason === 'connect-timeout') {
        throw new HermesGatewayConnectionError('gateway-ready-timeout');
      }
      throw error;
    });
  }

  private handleFrame(
    raw: unknown,
    readyResolve: (ready: HermesGatewayReady) => void,
    readyReject: (error: unknown) => void,
  ): void {
    let frame: JsonRpcFrame;
    try {
      frame = typeof raw === 'string' ? (JSON.parse(raw) as JsonRpcFrame) : (raw as JsonRpcFrame);
    } catch {
      return;
    }

    if (!isRecord(frame)) return;

    if (frame.id !== undefined && ('result' in frame || 'error' in frame)) {
      const pending = this.pending.get(frameIdKey(frame.id));
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(frameIdKey(frame.id));
      if (frame.error) {
        pending.reject(
          new HermesGatewayRpcError(frame.error.code ?? -32000, frame.error.message ?? 'Hermes RPC failed'),
        );
      } else {
        pending.resolve(frame.result);
      }
      return;
    }

    if (frame.method && frame.id !== undefined) {
      this.handleServerRequest(frame);
      return;
    }

    if (frame.method === 'event' || frame.method === 'gateway.ready') {
      const params = isRecord(frame.params) ? frame.params : {};
      const type = frame.method === 'gateway.ready' ? 'gateway.ready' : String(params.type ?? 'unknown');
      const payload = isRecord(params.payload) ? params.payload : params.payload;
      const event: HermesGatewayEvent = {
        type,
        sessionId: typeof params.session_id === 'string' ? params.session_id : null,
        payload,
      };
      if (type === 'gateway.ready') {
        const ready: HermesGatewayReady = {
          payload: isRecord(payload) ? payload : {},
        };
        this.ready = ready;
        readyResolve(ready);
      }
      for (const listener of this.eventListeners) {
        try {
          listener(event);
        } catch {
          // A consumer callback must not break the transport event loop.
        }
      }
      return;
    }

    if (frame.method) {
      const params = isRecord(frame.params) ? frame.params : {};
      const event: HermesGatewayEvent = {
        type: frame.method,
        sessionId: typeof params.session_id === 'string' ? params.session_id : null,
        payload: params.payload ?? params,
      };
      for (const listener of this.eventListeners) {
        try {
          listener(event);
        } catch {
          // A consumer callback must not break the transport event loop.
        }
      }
    }

    void readyReject;
  }

  private handleServerRequest(frame: JsonRpcFrame): void {
    if (frame.id === undefined || !frame.method) return;
    let settled = false;
    const responder: HermesGatewayServerRequestResponder = {
      result: (value) => {
        if (settled) return;
        settled = true;
        this.sendResponse(frame.id as JsonRpcId, { result: value });
      },
      error: (code, message) => {
        if (settled) return;
        settled = true;
        this.sendResponse(frame.id as JsonRpcId, { error: { code, message } });
      },
    };
    const request: HermesGatewayServerRequest = {
      id: frame.id,
      method: frame.method,
      params: frame.params,
    };

    if (this.serverRequestListeners.size === 0) {
      responder.error(-32601, 'Project Forge has no handler for this Hermes request');
      return;
    }

    for (const listener of this.serverRequestListeners) {
      try {
        listener(request, responder);
      } catch {
        responder.error(-32603, 'Project Forge failed to handle this Hermes request');
      }
    }
  }

  private sendResponse(id: JsonRpcId, response: { result?: unknown; error?: { code: number; message: string } }): void {
    if (!this.socket) return;
    try {
      this.socket.send(JSON.stringify({ jsonrpc: '2.0', id, ...response }));
    } catch {
      // The close handler rejects outstanding calls. A failed best-effort response must not throw into the event loop.
    }
  }

  private rejectPending(error: unknown): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}
