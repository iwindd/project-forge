import { z } from 'zod';

export const hermesSessionIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const createHermesSessionSchema = z.object({
  agentHandle: z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9_-]+$/),
});

export const renameHermesSessionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .refine((value) => !hasUnsupportedTitleCharacter(value), 'title contains unsupported characters'),
});

export const hermesSessionSummarySchema = z.object({
  id: z.string().uuid(),
  agentHandle: z.string(),
  title: z.string(),
  preview: z.string(),
  messageCount: z.number().int().nonnegative(),
  startedAt: z.string().nullable(),
  active: z.boolean(),
  closedAt: z.string().nullable(),
});

export const hermesSessionSnapshotSchema = z.object({
  sessionId: z.string().uuid(),
  agentHandle: z.string(),
  title: z.string(),
  messages: z.array(
    z.object({
      role: z.string(),
      text: z.string(),
      timestamp: z.string().nullable(),
      rowId: z.number().int().nullable(),
    }),
  ),
  messageCount: z.number().int().nonnegative(),
  status: z.enum(['idle', 'starting', 'waiting', 'working', 'streaming', 'resuming']),
  inflight: z
    .object({
      user: z.string(),
      assistant: z.string(),
      streaming: z.boolean(),
      status: z.string().nullable(),
    })
    .nullable(),
});

export const hermesSessionListResponseEnvelopeSchema = z.object({
  data: z.object({ sessions: z.array(hermesSessionSummarySchema) }),
});

export const hermesSessionResponseEnvelopeSchema = z.object({
  data: z.object({
    session: hermesSessionSummarySchema,
    snapshot: hermesSessionSnapshotSchema,
  }),
});

export const hermesSessionActionResponseEnvelopeSchema = z.object({
  data: z.null(),
});

function hasUnsupportedTitleCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127;
  });
}
