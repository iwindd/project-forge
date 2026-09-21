import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ConflictError, ExternalServiceError, NotFoundError } from '../../../common/errors/application-error.js';
import type { HermesGatewayEvent } from '../domain/hermes-runtime.types.js';
import {
  type HermesSessionAttachment,
  type HermesSessionRecord,
  type HermesSessionSnapshot,
  type HermesSessionSummary,
  HERMES_SESSION_REPOSITORY,
} from '../domain/hermes-session.types.js';
import { HermesRuntimeService } from './hermes-runtime.service.js';
import type { HermesSessionRepositoryPort } from './ports/hermes-session.repository.js';
import { ListSharedAgentsUseCase } from './use-cases/list-shared-agents-use-case.js';

const sessionResponseSchema = z
  .object({
    session_id: z.string().min(1),
    stored_session_id: z.string().min(1).optional(),
    message_count: z.number().int().nonnegative().optional().default(0),
    messages: z.array(z.unknown()).optional().default([]),
    info: z.record(z.string(), z.unknown()).optional().default({}),
    status: z.string().optional(),
    inflight: z.unknown().nullable().optional(),
  })
  .passthrough();

const sessionListResponseSchema = z.object({
  sessions: z.array(z.record(z.string(), z.unknown())),
});

const activeSessionListResponseSchema = z.object({
  sessions: z.array(z.record(z.string(), z.unknown())),
});

const agentRosterSchema = z.object({
  agents: z.array(
    z.object({
      handle: z.string(),
      readiness: z.string(),
    }),
  ),
});

type HermesRuntimeReader = {
  request(method: string, params?: unknown): Promise<unknown>;
};
type SharedAgentReader = Pick<ListSharedAgentsUseCase, 'execute'>;

type RawSessionRow = Record<string, unknown>;

const PENDING_RUNTIME_SESSION_TTL_MS = 15 * 60 * 1000;

type PendingRuntimeSession = {
  runtimeSessionId: string;
  snapshot: HermesSessionSnapshot;
  expiresAt: number;
};

@Injectable()
export class HermesSessionService {
  private readonly pendingRuntimeSessions = new Map<string, PendingRuntimeSession>();

  constructor(
    @Inject(HermesRuntimeService)
    private readonly runtime: HermesRuntimeReader,
    @Inject(HERMES_SESSION_REPOSITORY) private readonly sessions: HermesSessionRepositoryPort,
    @Inject(ListSharedAgentsUseCase)
    private readonly agents: SharedAgentReader,
  ) {}

  async create(userId: string, agentHandle: string): Promise<HermesSessionAttachment> {
    await this.assertReadyAgent(agentHandle);
    const parsed = await this.createNativeSession(agentHandle);

    const now = new Date();
    const record: HermesSessionRecord = {
      id: crypto.randomUUID(),
      userId,
      agentHandle,
      hermesSessionId: parsed.stored_session_id ?? parsed.session_id,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
    };
    await this.sessions.create(record);

    const snapshot = this.projectSnapshot(record, parsed);
    this.pendingRuntimeSessions.set(record.id, {
      runtimeSessionId: parsed.session_id,
      snapshot,
      expiresAt: Date.now() + PENDING_RUNTIME_SESSION_TTL_MS,
    });

    return {
      record,
      runtimeSessionId: parsed.session_id,
      snapshot,
    };
  }

  async list(userId: string): Promise<HermesSessionSummary[]> {
    const records = await this.sessions.listForUser(userId);
    const recordsByAgent = new Map<string, HermesSessionRecord[]>();
    for (const record of records) {
      const agentRecords = recordsByAgent.get(record.agentHandle) ?? [];
      agentRecords.push(record);
      recordsByAgent.set(record.agentHandle, agentRecords);
    }

    const summaries = await Promise.all(
      [...recordsByAgent.entries()].map(([agentHandle, agentRecords]) =>
        this.readSummaries(agentHandle, agentRecords),
      ),
    );
    return summaries.flat().sort((left, right) => {
      const leftTime = left.startedAt ? Date.parse(left.startedAt) : 0;
      const rightTime = right.startedAt ? Date.parse(right.startedAt) : 0;
      return rightTime - leftTime;
    });
  }

  async attach(userId: string, id: string): Promise<HermesSessionAttachment> {
    const record = await this.requireOwned(userId, id);
    const pending = this.pendingRuntimeSessions.get(id);
    if (pending) {
      if (pending.expiresAt > Date.now()) {
        return {
          record: { ...record, closedAt: null },
          runtimeSessionId: pending.runtimeSessionId,
          snapshot: pending.snapshot,
        };
      }
      this.pendingRuntimeSessions.delete(id);
    }

    let parsed: z.infer<typeof sessionResponseSchema>;
    try {
      const raw = await this.runtime.request('session.resume', {
        profile: record.agentHandle,
        session_id: record.hermesSessionId,
      });
      const validated = sessionResponseSchema.safeParse(raw);
      if (!validated.success) throw new ExternalServiceError('Hermes returned an invalid Session resume response');
      parsed = validated.data;
    } catch (error) {
      if (!this.isRecoverableEmptyDraft(record, error)) throw error;
      await this.assertReadyAgent(record.agentHandle);
      const replacement = await this.createNativeSession(record.agentHandle);
      const now = new Date();
      const replacementRecord = {
        ...record,
        hermesSessionId: replacement.stored_session_id ?? replacement.session_id,
        updatedAt: now,
        closedAt: null,
      };
      await this.sessions.replaceRuntimeSession(userId, id, replacementRecord.hermesSessionId, now);
      const snapshot = this.projectSnapshot(replacementRecord, replacement);
      this.pendingRuntimeSessions.set(id, {
        runtimeSessionId: replacement.session_id,
        snapshot,
        expiresAt: Date.now() + PENDING_RUNTIME_SESSION_TTL_MS,
      });
      return { record: replacementRecord, runtimeSessionId: replacement.session_id, snapshot };
    }
    if (record.closedAt) await this.sessions.markOpened(userId, id, new Date());

    return {
      record: { ...record, closedAt: null },
      runtimeSessionId: parsed.session_id,
      snapshot: this.projectSnapshot({ ...record, closedAt: null }, parsed),
    };
  }

  markPromptAccepted(id: string): void {
    this.pendingRuntimeSessions.delete(id);
  }

  async rename(userId: string, id: string, title: string): Promise<void> {
    const attachment = await this.attach(userId, id);
    await this.runtime.request('session.title', {
      profile: attachment.record.agentHandle,
      session_id: attachment.runtimeSessionId,
      title,
    });
  }

  async close(userId: string, id: string): Promise<void> {
    const attachment = await this.attach(userId, id);
    await this.runtime.request('session.close', {
      profile: attachment.record.agentHandle,
      session_id: attachment.runtimeSessionId,
    });
    this.pendingRuntimeSessions.delete(id);
    await this.sessions.markClosed(userId, id, new Date());
  }

  async requireOwned(userId: string, id: string): Promise<HermesSessionRecord> {
    const record = await this.sessions.findByIdForUser(userId, id);
    if (!record) throw new NotFoundError('Hermes Session was not found');
    return record;
  }

  private async assertReadyAgent(agentHandle: string): Promise<void> {
    const rawRoster = await this.agents.execute({ canConfigure: false });
    const roster = agentRosterSchema.safeParse(rawRoster);
    const agent = roster.success ? roster.data.agents.find((candidate) => candidate.handle === agentHandle) : null;
    if (!agent) throw new NotFoundError('Shared Agent was not found');
    if (agent.readiness !== 'ready') throw new ConflictError('Selected Shared Agent is not ready');
  }

  private async createNativeSession(agentHandle: string): Promise<z.infer<typeof sessionResponseSchema>> {
    const raw = await this.runtime.request('session.create', {
      profile: agentHandle,
      source: 'project-forge',
    });
    const parsed = sessionResponseSchema.safeParse(raw);
    if (!parsed.success) throw new ExternalServiceError('Hermes returned an invalid Session response');
    return parsed.data;
  }

  private isRecoverableEmptyDraft(record: HermesSessionRecord, error: unknown): boolean {
    return record.createdAt.getTime() === record.updatedAt.getTime() && isRecord(error) && error.rpcCode === 4007;
  }

  private async readSummaries(
    agentHandle: string,
    records: HermesSessionRecord[],
  ): Promise<HermesSessionSummary[]> {
    let rows: RawSessionRow[] = [];
    let activeRows: RawSessionRow[] = [];
    try {
      const raw = await this.runtime.request('session.list', {
        profile: agentHandle,
        include_hidden: true,
        limit: 200,
      });
      const parsed = sessionListResponseSchema.safeParse(raw);
      if (parsed.success) rows = parsed.data.sessions;
    } catch {
      return records.map((record) => projectSummary(record));
    }

    try {
      const rawActive = await this.runtime.request('session.active_list', {
        profile: agentHandle,
      });
      const parsedActive = activeSessionListResponseSchema.safeParse(rawActive);
      if (parsedActive.success) activeRows = parsedActive.data.sessions;
    } catch {
      activeRows = [];
    }

    return records.map((record) => {
      const row = rows.find((candidate) => candidate.id === record.hermesSessionId);
      const activeRow = activeRows.find(
        (candidate) => candidate.session_key === record.hermesSessionId || candidate.id === record.hermesSessionId,
      );
      return projectSummary(record, row, activeRow);
    });
  }

  private projectSnapshot(record: HermesSessionRecord, raw: z.infer<typeof sessionResponseSchema>): HermesSessionSnapshot {
    const info = raw.info;
    return {
      sessionId: record.id,
      agentHandle: record.agentHandle,
      title: safeText(typeof info.title === 'string' ? info.title : '', 200),
      messages: raw.messages.flatMap(projectMessage),
      messageCount: raw.message_count,
      status: safeStatus(raw.status),
      inflight: projectInflight(raw.inflight),
    };
  }
}

export function projectHermesEvent(event: HermesGatewayEvent, localSessionId: string): Record<string, unknown> | null {
  const payload = isRecord(event.payload) ? event.payload : {};
  if (event.type === 'message.start') return { type: 'assistant.start', sessionId: localSessionId };
  if (event.type === 'message.delta') {
    const text = typeof payload.text === 'string' ? safeText(payload.text, 40_000) : '';
    return text ? { type: 'assistant.delta', sessionId: localSessionId, text } : null;
  }
  if (event.type === 'message.complete') {
    const status = typeof payload.status === 'string' ? payload.status : 'complete';
    return {
      type: 'assistant.complete',
      sessionId: localSessionId,
      text: safeText(typeof payload.text === 'string' ? payload.text : '', 100_000),
      status: ['complete', 'error', 'interrupted'].includes(status) ? status : 'complete',
      partial: payload.partial === true,
    };
  }
  if (event.type === 'session.title') {
    return {
      type: 'session.updated',
      sessionId: localSessionId,
      title: safeText(typeof payload.title === 'string' ? payload.title : '', 200),
    };
  }
  if (event.type === 'error') {
    return {
      type: 'error',
      code: 'MESSAGE_FAILED',
      sessionId: localSessionId,
      message: safeText(typeof payload.message === 'string' ? payload.message : 'Hermes turn failed', 500),
    };
  }
  return null;
}

function projectSummary(record: HermesSessionRecord, row?: RawSessionRow, activeRow?: RawSessionRow): HermesSessionSummary {
  const startedAt = toIsoTimestamp(row?.started_at) ?? record.createdAt.toISOString();
  const messageCount = numberValue(row?.message_count);
  const active = !record.closedAt && (row?.is_active === true || activeRow !== undefined);
  return {
    id: record.id,
    agentHandle: record.agentHandle,
    title: safeText(stringValue(row?.title), 200),
    preview: safeText(stringValue(row?.preview), 500),
    messageCount,
    startedAt,
    active,
    closedAt: record.closedAt?.toISOString() ?? null,
  };
}

function projectMessage(value: unknown): HermesSessionSnapshot['messages'] {
  if (!isRecord(value)) return [];
  const text = typeof value.text === 'string' ? value.text : typeof value.content === 'string' ? value.content : '';
  if (!text) return [];
  return [
    {
      role: safeText(typeof value.role === 'string' ? value.role : 'assistant', 32),
      text: safeText(text, 100_000),
      timestamp: toIsoTimestamp(value.timestamp),
      rowId: numberOrNull(value.row_id),
    },
  ];
}

function projectInflight(value: unknown): HermesSessionSnapshot['inflight'] {
  if (!isRecord(value)) return null;
  return {
    user: safeText(stringValue(value.user), 100_000),
    assistant: safeText(stringValue(value.assistant), 100_000),
    streaming: value.streaming === true,
    status: typeof value.status === 'string' ? safeText(value.status, 64) : null,
  };
}

function safeStatus(value: unknown): HermesSessionSnapshot['status'] {
  return ['idle', 'starting', 'waiting', 'working', 'streaming', 'resuming'].includes(String(value))
    ? (value as HermesSessionSnapshot['status'])
    : 'idle';
}

function toIsoTimestamp(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function safeText(value: string, maxLength: number): string {
  return value.replaceAll('\u0000', '').trim().slice(0, maxLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
