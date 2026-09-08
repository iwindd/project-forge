import { randomUUID } from 'node:crypto';

export enum AccessRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export type AccessRequestRecord = {
  id: string;
  userId: string;
  reason: string | null;
  status: AccessRequestStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function createAccessRequest(userId: string, reason: string | null): AccessRequestRecord {
  const now = new Date();
  return {
    id: randomUUID(),
    userId,
    reason,
    status: AccessRequestStatus.PENDING,
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    createdAt: now,
    updatedAt: now,
  };
}
