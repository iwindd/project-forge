import { z } from 'zod';
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js';

const identitySchema = z.object({
  id: databaseUuidSchema,
  githubUserId: z.string().min(1),
  githubLogin: z.string().min(1),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(['ADMIN', 'USER']),
  accessStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']),
  isActive: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const profileSchema = z.object({
  id: databaseUuidSchema,
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  timezone: z.string().nullable(),
  updatedAt: z.string().min(1),
});

export const authMeDataSchema = z.object({
  user: identitySchema,
  profile: profileSchema.nullable(),
}).strict();
