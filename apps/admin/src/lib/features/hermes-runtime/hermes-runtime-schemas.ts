import { z } from 'zod';

export const hermesRuntimeStateSchema = z.enum([
  'unconfigured',
  'detecting',
  'starting',
  'connecting',
  'negotiating',
  'ready',
  'missing',
  'incompatible',
  'unhealthy',
  'port-conflict',
]);

export const hermesRuntimeStatusSchema = z.object({
  state: hermesRuntimeStateSchema,
  endpoint: z.object({
    host: z.string(),
    port: z.number(),
    path: z.string(),
    managed: z.boolean(),
  }),
  version: z.string().nullable(),
  capabilities: z.array(z.string()),
  backendEpoch: z.string().nullable(),
  serverRequests: z.enum(['unknown', 'advertised', 'legacy']),
  checkedAt: z.string().nullable(),
  message: z.string(),
  action: z.enum(['configure', 'install-hermes', 'start-hermes', 'check-port', 'retry']).nullable(),
});

export type HermesRuntimeStatus = z.infer<typeof hermesRuntimeStatusSchema>;

export function parseHermesRuntimeStatus(value: unknown): HermesRuntimeStatus {
  return hermesRuntimeStatusSchema.parse(value);
}
