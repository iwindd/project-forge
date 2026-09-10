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

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(200),
  reason: z.string().trim().max(1000).optional().default(''),
});

export const githubCallbackQuerySchema = z.object({
  code: z.string().trim().min(1),
  state: z.string().trim().min(1),
});

export const githubReturnToSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => value.startsWith('/') && !value.startsWith('//'),
    'returnTo must be a same-origin path',
  );

export const githubStartQuerySchema = z.object({
  returnTo: githubReturnToSchema.optional(),
});

export const authMeDataSchema = z.object({
  user: identitySchema,
  profile: profileSchema.nullable(),
}).strict();

export const authMeResponseSchema = z.object({
  data: authMeDataSchema,
}).strict();

export const authUpdateMeResponseSchema = z.object({
  data: z.object({
    user: identitySchema,
  }),
}).strict();
