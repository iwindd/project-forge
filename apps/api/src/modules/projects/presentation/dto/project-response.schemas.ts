import { z } from 'zod';
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js';

const projectResponseSchema = z.object({
  id: databaseUuidSchema,
  organizationId: databaseUuidSchema,
  name: z.string().min(1),
  githubUrl: z.string().url(),
  githubOwner: z.string().min(1),
  githubRepo: z.string().min(1),
  sourceBranch: z.string().min(1),
  targetBranch: z.string().min(1),
  nodeVersion: z.string().nullable(),
  environmentMetadata: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  archivedAt: z.string().nullable(),
});

export const projectListResponseSchema = z.object({
  data: z.array(projectResponseSchema),
});

export const projectResponseEnvelopeSchema = z.object({
  data: z.object({
    project: projectResponseSchema,
  }),
});
