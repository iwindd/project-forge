import { z } from 'zod';
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js';

const profileConnectionSchema = z.object({
  id: databaseUuidSchema,
  provider: z.literal('GITHUB'),
  username: z.string().nullable(),
  email: z.string().nullable(),
  connectedAt: z.string().min(1),
});

const profileDataSchema = z.object({
  id: databaseUuidSchema,
  displayName: z.string().min(1),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  timezone: z.string().nullable(),
  platformRole: z.enum(['ADMIN', 'USER']),
  accountStatus: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const profileUpdateDataSchema = z.object({
  id: databaseUuidSchema,
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  timezone: z.string().nullable(),
  updatedAt: z.string().min(1),
});

export const profileResponseSchema = z.object({
  profile: profileDataSchema,
  connections: z.array(profileConnectionSchema),
});

export const profileUpdateResponseSchema = z.object({
  profile: profileUpdateDataSchema,
});

export const profileConnectionsResponseSchema = z.array(profileConnectionSchema);

export const profileResponseEnvelopeSchema = z
  .object({
    data: profileResponseSchema,
  })
  .strict();

export const profileUpdateResponseEnvelopeSchema = z
  .object({
    data: profileUpdateResponseSchema,
  })
  .strict();

export const profileConnectionsResponseEnvelopeSchema = z
  .object({
    data: profileConnectionsResponseSchema,
  })
  .strict();
