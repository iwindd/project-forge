import { z } from 'zod';

const hermesRuntimeStateSchema = z.enum([
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

const hermesRuntimeActionSchema = z
  .enum(['configure', 'install-hermes', 'start-hermes', 'check-port', 'retry'])
  .nullable();

const sharedAgentSchema = z.object({
  handle: z.string().min(1).max(160),
  displayName: z.string().min(1).max(500),
  description: z.string().max(500),
  isDefault: z.boolean(),
  model: z.string().max(160).nullable(),
  provider: z.string().max(160).nullable(),
  skillCount: z.number().int().nonnegative(),
  readiness: z.enum(['ready', 'unavailable', 'incompatible', 'incomplete-configuration']),
  message: z.string().min(1).max(500),
  action: z.enum(['use', 'retry', 'configure']),
});

const sharedAgentRuntimeSchema = z.object({
  state: hermesRuntimeStateSchema,
  message: z.string().min(1).max(500),
  action: hermesRuntimeActionSchema,
});

export const sharedAgentRosterResponseSchema = z.object({
  agents: z.array(sharedAgentSchema),
  runtime: sharedAgentRuntimeSchema,
  permissions: z.object({
    canConfigure: z.boolean(),
  }),
  refreshedAt: z.string().min(1),
});

export const sharedAgentRosterResponseEnvelopeSchema = z
  .object({
    data: sharedAgentRosterResponseSchema,
  })
  .strict();
