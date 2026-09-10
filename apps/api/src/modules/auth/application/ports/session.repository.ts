import type { SessionRecord } from '../../domain/session.js';

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

export interface SessionRepository {
  findActiveByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  save(session: SessionRecord): Promise<void>;
  create(session: SessionRecord): Promise<void>;
  revokeByTokenHash(tokenHash: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}
