import type { IncomingMessage, Server as HttpServer } from 'node:http';
import { EntityManager, RequestContext } from '@mikro-orm/core';
import { Inject, Injectable, Optional, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocket, WebSocketServer } from 'ws';
import { z } from 'zod';
import { SESSION_AUTHENTICATOR } from '../../../common/auth/auth.types.js';
import type { AuthenticatedPrincipal, SessionAuthenticator } from '../../../common/auth/auth.types.js';
import type { HermesGatewayEvent } from '../domain/hermes-runtime.types.js';
import { HermesRuntimeService } from '../application/hermes-runtime.service.js';
import { HermesSessionService, projectHermesEvent } from '../application/hermes-session.service.js';

const clientFrameSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('attach'), sessionId: z.string().uuid() }),
  z.object({
    type: z.literal('message'),
    sessionId: z.string().uuid(),
    text: z.string().trim().min(1).max(100_000),
    clientMessageId: z.string().trim().max(100).optional(),
  }),
]);

type RuntimeReader = {
  onEvent(listener: (event: HermesGatewayEvent) => void): () => void;
  request(method: string, params?: unknown): Promise<unknown>;
};
type SessionReader = Pick<HermesSessionService, 'attach'> & {
  markPromptAccepted?: (id: string) => void;
};
type OriginReader = { get<T = unknown>(propertyPath: string): T | undefined };

type ClientState = {
  socket: WebSocket;
  principal: AuthenticatedPrincipal;
  localSessionId: string | null;
  runtimeSessionId: string | null;
  storedSessionId: string | null;
};

@Injectable()
export class HermesChatGateway implements OnModuleDestroy {
  private websocketServer: WebSocketServer | null = null;
  private httpServer: HttpServer | null = null;
  private unsubscribeRuntime: (() => void) | null = null;
  private readonly clients = new Set<ClientState>();
  private readonly onUpgrade = (request: IncomingMessage, socket: NodeJS.WritableStream & { destroy: () => void }, head: Buffer) => {
    this.withRequestContext(() => {
      void this.handleUpgrade(request, socket, head);
    });
  };

  constructor(
    @Inject(HermesRuntimeService)
    private readonly runtime: RuntimeReader,
    @Inject(HermesSessionService)
    private readonly sessions: SessionReader,
    @Inject(SESSION_AUTHENTICATOR) private readonly authenticator: SessionAuthenticator,
    @Inject(ConfigService)
    private readonly config: OriginReader,
    @Optional() private readonly entityManager?: EntityManager,
  ) {}

  attach(server: HttpServer): void {
    if (this.httpServer) return;
    this.httpServer = server;
    this.websocketServer = new WebSocketServer({ noServer: true });
    this.websocketServer.on(
      'connection',
      (socket: WebSocket, request: IncomingMessage, principal: AuthenticatedPrincipal) => {
        this.handleConnection(socket, request, principal);
      },
    );
    this.unsubscribeRuntime = this.runtime.onEvent((event) => this.broadcast(event));
    server.on('upgrade', this.onUpgrade);
  }

  async close(): Promise<void> {
    this.unsubscribeRuntime?.();
    this.unsubscribeRuntime = null;
    if (this.httpServer) this.httpServer.off('upgrade', this.onUpgrade);
    this.httpServer = null;
    for (const client of this.clients) client.socket.close(1001, 'server-shutdown');
    this.clients.clear();
    const websocketServer = this.websocketServer;
    this.websocketServer = null;
    if (websocketServer) await new Promise<void>((resolve) => websocketServer.close(() => resolve()));
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  private async handleUpgrade(
    request: IncomingMessage,
    socket: NodeJS.WritableStream & { destroy: () => void },
    head: Buffer,
  ): Promise<void> {
    const requestUrl = new URL(request.url ?? '/', 'http://localhost');
    if (requestUrl.pathname !== '/api/v1/hermes/chat') {
      socket.destroy();
      return;
    }
    const origin = request.headers.origin;
    if (origin && !this.allowedOrigins().has(origin)) {
      rejectUpgrade(socket, 403, 'Forbidden');
      return;
    }
    const token = readCookie(request.headers.cookie, 'pf_session');
    const principal = await this.authenticator.principalFromToken(token);
    if (!principal) {
      rejectUpgrade(socket, 401, 'Unauthorized');
      return;
    }
    this.websocketServer?.handleUpgrade(request, socket as never, head, (client) => {
      this.websocketServer?.emit('connection', client, request, principal);
    });
  }

  private handleConnection(socket: WebSocket, _request: IncomingMessage, principal: AuthenticatedPrincipal): void {
    const client: ClientState = {
      socket,
      principal,
      localSessionId: null,
      runtimeSessionId: null,
      storedSessionId: null,
    };
    this.clients.add(client);
    sendFrame(socket, { type: 'ready' });

    socket.on('message', (data) => {
      this.withRequestContext(() => {
        void this.handleClientFrame(client, data.toString());
      });
    });
    socket.on('close', () => this.clients.delete(client));
    socket.on('error', () => this.clients.delete(client));
  }

  private async handleClientFrame(client: ClientState, raw: string): Promise<void> {
    let value: unknown;
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      sendFrame(client.socket, { type: 'error', code: 'INVALID_FRAME', message: 'Invalid chat message' });
      return;
    }
    const parsed = clientFrameSchema.safeParse(value);
    if (!parsed.success) {
      sendFrame(client.socket, { type: 'error', code: 'INVALID_FRAME', message: 'Invalid chat message' });
      return;
    }

    if (parsed.data.type === 'attach') {
      await this.attachSession(client, parsed.data.sessionId);
      return;
    }

    if (client.localSessionId !== parsed.data.sessionId || !client.runtimeSessionId) {
      sendFrame(client.socket, { type: 'error', code: 'SESSION_NOT_ATTACHED', message: 'Open the conversation again' });
      return;
    }

    try {
      const result = await this.runtime.request('prompt.submit', {
        session_id: client.runtimeSessionId,
        text: parsed.data.text,
      });
      if (client.localSessionId) this.sessions.markPromptAccepted?.(client.localSessionId);
      sendFrame(client.socket, {
        type: 'message.accepted',
        sessionId: client.localSessionId,
        clientMessageId: parsed.data.clientMessageId ?? null,
        status: isRecord(result) && typeof result.status === 'string' ? result.status : 'streaming',
      });
    } catch {
      sendFrame(client.socket, {
        type: 'error',
        code: 'MESSAGE_FAILED',
        sessionId: client.localSessionId,
        message: 'ไม่สามารถส่งข้อความได้',
      });
    }
  }

  private async attachSession(client: ClientState, sessionId: string): Promise<void> {
    try {
      const attachment = await this.sessions.attach(client.principal.id, sessionId);
      client.localSessionId = sessionId;
      client.runtimeSessionId = attachment.runtimeSessionId;
      client.storedSessionId = attachment.record.hermesSessionId;
      sendFrame(client.socket, { type: 'snapshot', session: attachment.snapshot });
    } catch {
      sendFrame(client.socket, {
        type: 'error',
        code: 'SESSION_UNAVAILABLE',
        sessionId,
        message: 'ไม่สามารถเปิดการสนทนาได้',
      });
    }
  }

  private broadcast(event: HermesGatewayEvent): void {
    if (!event.sessionId) return;
    for (const client of this.clients) {
      const matchesRuntimeSession = client.runtimeSessionId === event.sessionId;
      const matchesStoredSession = client.storedSessionId === event.sessionId;
      if ((!matchesRuntimeSession && !matchesStoredSession) || !client.localSessionId) continue;
      const frame = projectHermesEvent(event, client.localSessionId);
      if (frame) sendFrame(client.socket, frame);
    }
  }

  private allowedOrigins(): Set<string> {
    return new Set(
      ['ADMIN_ORIGIN', 'WEB_ORIGIN']
        .map((key) => this.config.get<string>(key))
        .filter((value): value is string => Boolean(value)),
    );
  }

  private withRequestContext(callback: () => void): void {
    if (this.entityManager) {
      RequestContext.create(this.entityManager, callback);
      return;
    }
    callback();
  }
}

function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of header?.split(';') ?? []) {
    const [key, ...value] = part.trim().split('=');
    if (key !== name) continue;
    const raw = value.join('=');
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return undefined;
}

function rejectUpgrade(socket: NodeJS.WritableStream & { destroy: () => void }, status: number, text: string): void {
  socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

function sendFrame(socket: WebSocket, frame: Record<string, unknown>): void {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(frame));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
