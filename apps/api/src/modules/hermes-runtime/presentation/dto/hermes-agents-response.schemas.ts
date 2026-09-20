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
  hasAvatar: z.boolean(),
  readiness: z.enum(['ready', 'unavailable', 'incompatible', 'incomplete-configuration']),
  message: z.string().min(1).max(500),
  action: z.enum(['use', 'retry', 'configure']),
});

const sharedAgentRuntimeSchema = z.object({
  state: hermesRuntimeStateSchema,
  message: z.string().min(1).max(500),
  action: hermesRuntimeActionSchema,
});

const sharedAgentSectionSchema = z.object({
  status: z.enum(['applied', 'failed', 'skipped']),
  message: z.string().max(500).optional(),
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

export const sharedAgentOptionsResponseEnvelopeSchema = z
  .object({
    data: z.object({
      models: z.array(
        z.object({
          provider: z.string().min(1).max(160),
          name: z.string().min(1).max(160),
          models: z.array(z.string().min(1).max(160)),
        }),
      ),
      skills: z.array(z.string().min(1).max(160)),
      toolsets: z.array(
        z.object({
          name: z.string().min(1).max(160),
          label: z.string().min(1).max(500),
          description: z.string().max(500),
          toolCount: z.number().int().nonnegative(),
        }),
      ),
      runtime: sharedAgentRuntimeSchema,
      refreshedAt: z.string().min(1),
    }),
  })
  .strict();

export const sharedAgentCreationResponseEnvelopeSchema = z
  .object({
    data: z.object({
      handle: z.string().min(1).max(160),
      status: z.enum(['ready', 'incomplete']),
      agent: sharedAgentSchema.nullable(),
      sections: z.object({
        identity: sharedAgentSectionSchema,
        role: sharedAgentSectionSchema,
        personality: sharedAgentSectionSchema,
        model: sharedAgentSectionSchema,
        skills: sharedAgentSectionSchema,
        toolsets: sharedAgentSectionSchema,
        avatar: sharedAgentSectionSchema,
        readback: sharedAgentSectionSchema,
        runtime: sharedAgentSectionSchema,
        audit: sharedAgentSectionSchema,
      }),
      requiresConfirmation: z.boolean(),
      refreshedAt: z.string().min(1),
    }),
  })
  .strict();
