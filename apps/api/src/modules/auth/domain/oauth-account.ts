import { randomUUID } from 'node:crypto';

export type OAuthAccountRecord = {
  id: string;
  userId: string;
  provider: 'GITHUB';
  providerAccountId: string;
  accessTokenCiphertext: string | null;
  scope: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function createOAuthAccount(input: {
  userId: string;
  providerAccountId: string;
  accessTokenCiphertext: string;
  scope: string | null;
}): OAuthAccountRecord {
  const now = new Date();
  return {
    id: randomUUID(),
    userId: input.userId,
    provider: 'GITHUB',
    providerAccountId: input.providerAccountId,
    accessTokenCiphertext: input.accessTokenCiphertext,
    scope: input.scope,
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
