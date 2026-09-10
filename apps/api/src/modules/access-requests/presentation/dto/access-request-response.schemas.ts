import { z } from 'zod';
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js';

const dateSchema = z.string().min(1);

const accessRequestResponseSchema = z.object({
  id: databaseUuidSchema,
  userId: databaseUuidSchema,
  reason: z.string().nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  reviewedBy: databaseUuidSchema.nullable(),
  reviewedAt: dateSchema.nullable(),
  reviewNote: z.string().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

const userResponseSchema = z.object({
  id: databaseUuidSchema,
  githubUserId: z.string().min(1),
  githubLogin: z.string().min(1),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(['ADMIN', 'USER']),
  accessStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']),
  isActive: z.boolean(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

const accessRequestWithUserResponseSchema = accessRequestResponseSchema.extend({
  user: userResponseSchema.nullable(),
});

export const accessRequestListResponseSchema = z.object({
  data: z.object({
    requests: z.array(accessRequestResponseSchema),
  }),
});

export const accessRequestResponseEnvelopeSchema = z.object({
  data: z.object({
    request: accessRequestResponseSchema,
  }),
});

export const accessRequestAdminListResponseSchema = z.object({
  data: z.object({
    requests: z.array(accessRequestWithUserResponseSchema),
  }),
});

export const accessRequestReviewResponseSchema = z.object({
  data: z.object({
    request: accessRequestResponseSchema,
    user: userResponseSchema,
  }),
});
