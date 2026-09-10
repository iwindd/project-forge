import { z } from 'zod';
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js';

export const requestAccessSchema = z.object({
  reason: z.string().trim().max(1000).optional().default(''),
});

export const reviewAccessRequestSchema = z.object({
  note: z.string().optional().default(''),
});

export const accessRequestIdParamSchema = z.object({
  id: databaseUuidSchema,
});

export type RequestAccessDto = z.infer<typeof requestAccessSchema>;
export type ReviewAccessRequestDto = z.infer<typeof reviewAccessRequestSchema>;
