export const HERMES_SESSION_REPOSITORY = Symbol('HERMES_SESSION_REPOSITORY');

export type HermesSessionRecord = {
  id: string;
  userId: string;
  agentHandle: string;
  hermesSessionId: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
};

export type HermesSessionSummary = {
  id: string;
  agentHandle: string;
  title: string;
  preview: string;
  messageCount: number;
  startedAt: string | null;
  active: boolean;
  closedAt: string | null;
};

export type HermesSessionSnapshot = {
  sessionId: string;
  agentHandle: string;
  title: string;
  messages: Array<{
    role: string;
    text: string;
    timestamp: string | null;
    rowId: number | null;
  }>;
  messageCount: number;
  status: 'idle' | 'starting' | 'waiting' | 'working' | 'streaming' | 'resuming';
  inflight: {
    user: string;
    assistant: string;
    streaming: boolean;
    status: string | null;
  } | null;
};

export type HermesSessionAttachment = {
  record: HermesSessionRecord;
  runtimeSessionId: string;
  snapshot: HermesSessionSnapshot;
};
