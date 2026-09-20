import type { HermesSessionRecord } from '../../domain/hermes-session.types.js';

export interface HermesSessionRepositoryPort {
  listForUser(userId: string): Promise<HermesSessionRecord[]>;
  findByIdForUser(userId: string, id: string): Promise<HermesSessionRecord | null>;
  create(record: HermesSessionRecord): Promise<void>;
  replaceRuntimeSession(userId: string, id: string, hermesSessionId: string, updatedAt: Date): Promise<void>;
  markOpened(userId: string, id: string, openedAt: Date): Promise<void>;
  markClosed(userId: string, id: string, closedAt: Date): Promise<void>;
}
