import { z } from 'zod';

export const requestAccessSchema = z.object({
  reason: z.string().trim().max(1000).optional().default(''),
});

export const reviewAccessRequestSchema = z.object({
  note: z.string().optional().default(''),
});

export type RequestAccessDto = z.infer<typeof requestAccessSchema>;
export type ReviewAccessRequestDto = z.infer<typeof reviewAccessRequestSchema>;
