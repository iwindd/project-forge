import { randomUUID } from 'node:crypto';

export type SessionRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  lastSeenAt: Date;
};

export function createSession(input: { userId: string; tokenHash: string; expiresAt: Date }): SessionRecord {
  const now = new Date();
  return {
    id: randomUUID(),
    userId: input.userId,
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
    revokedAt: null,
    createdAt: now,
    lastSeenAt: now,
  };
}
