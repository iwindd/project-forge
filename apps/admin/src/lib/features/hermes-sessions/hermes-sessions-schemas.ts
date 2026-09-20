import { z } from 'zod';

export const hermesSessionSummarySchema = z
  .object({
    id: z.string().uuid(),
    agentHandle: z.string().min(1),
    title: z.string(),
    preview: z.string(),
    messageCount: z.number().int().nonnegative(),
    startedAt: z.string().nullable(),
    active: z.boolean(),
    closedAt: z.string().nullable(),
  })
  .strict();

export const hermesChatMessageSchema = z
  .object({
    role: z.string().min(1).max(32),
    text: z.string(),
    timestamp: z.string().nullable(),
    rowId: z.number().int().nullable(),
  })
  .strict();

export const hermesSessionSnapshotSchema = z
  .object({
    sessionId: z.string().uuid(),
    agentHandle: z.string().min(1),
    title: z.string(),
    messages: z.array(hermesChatMessageSchema),
    messageCount: z.number().int().nonnegative(),
    status: z.enum(['idle', 'starting', 'waiting', 'working', 'streaming', 'resuming']),
    inflight: z
      .object({
        user: z.string(),
        assistant: z.string(),
        streaming: z.boolean(),
        status: z.string().nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict();

export const hermesSessionListResponseSchema = z.object({ sessions: z.array(hermesSessionSummarySchema).max(200) }).strict();

export const hermesSessionResponseSchema = z
  .object({ session: hermesSessionSummarySchema, snapshot: hermesSessionSnapshotSchema })
  .strict();

export type HermesSessionSummary = z.infer<typeof hermesSessionSummarySchema>;
export type HermesChatMessage = z.infer<typeof hermesChatMessageSchema>;
export type HermesSessionSnapshot = z.infer<typeof hermesSessionSnapshotSchema>;

export type HermesSessionResponse = {
  session: HermesSessionSummary;
  snapshot: HermesSessionSnapshot;
};

export function parseHermesSessionList(response: unknown): { sessions: HermesSessionSummary[] } {
  return hermesSessionListResponseSchema.parse(response);
}

export function parseHermesSessionResponse(response: unknown): HermesSessionResponse {
  return hermesSessionResponseSchema.parse(response);
}
