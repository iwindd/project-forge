import { randomUUID } from 'node:crypto';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum AccessStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export type UserRecord = {
  id: string;
  githubUserId: string;
  githubLogin: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  accessStatus: AccessStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function createUser(input: Pick<UserRecord, 'githubUserId' | 'githubLogin'>): UserRecord {
  const now = new Date();
  return {
    id: randomUUID(),
    githubUserId: input.githubUserId,
    githubLogin: input.githubLogin,
    name: null,
    avatarUrl: null,
    role: UserRole.USER,
    accessStatus: AccessStatus.PENDING,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}
