import { z } from 'zod';

export const sharedAgentSchema = z.object({
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

export const sharedAgentRuntimeSchema = z.object({
  state: z.enum([
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
  ]),
  message: z.string().min(1).max(500),
  action: z.enum(['configure', 'install-hermes', 'start-hermes', 'check-port', 'retry']).nullable(),
});

export const sharedAgentRosterSchema = z.object({
  agents: z.array(sharedAgentSchema),
  runtime: sharedAgentRuntimeSchema,
  permissions: z.object({
    canConfigure: z.boolean(),
  }),
  refreshedAt: z.string().min(1),
});

export const sharedAgentOptionsSchema = z.object({
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
});

export const sharedAgentSectionSchema = z.object({
  status: z.enum(['applied', 'failed', 'skipped']),
  message: z.string().max(500).optional(),
});

export const sharedAgentCreationSchema = z.object({
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
});

export type SharedAgent = z.infer<typeof sharedAgentSchema>;
export type SharedAgentRoster = z.infer<typeof sharedAgentRosterSchema>;
export type SharedAgentOptions = z.infer<typeof sharedAgentOptionsSchema>;
export type SharedAgentCreation = z.infer<typeof sharedAgentCreationSchema>;

export type CreateSharedAgentRequest = {
  handle: string;
  displayName: string;
  description: string;
  role: string;
  personality: string;
  provider: string;
  model: string;
  skills: string[];
  toolsets: string[];
  confirmExpensiveModel: boolean;
  avatar: string | null;
};

export function parseSharedAgentRoster(response: unknown): SharedAgentRoster {
  return sharedAgentRosterSchema.parse(response);
}

export function parseSharedAgentOptions(response: unknown): SharedAgentOptions {
  return sharedAgentOptionsSchema.parse(response);
}

export function parseSharedAgentCreation(response: unknown): SharedAgentCreation {
  return sharedAgentCreationSchema.parse(response);
}
