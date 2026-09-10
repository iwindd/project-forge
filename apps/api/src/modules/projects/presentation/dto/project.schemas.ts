import { z } from 'zod';
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js';

/** Environment metadata keys may only ever be variable names, never values. */
const ENVIRONMENT_VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * A bare credential (GitHub token, API key, cloud access key id) is identifier-shaped, so the
 * variable-name pattern alone would accept it and store the secret itself as the key name. Mirror
 * the Admin rule and reject any known credential prefix followed by 16 or more token characters,
 * so a token-shaped key cannot be stored even if a client sends one.
 */
const CREDENTIAL_SHAPED_ENVIRONMENT_NAME_PATTERN =
  /^(ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|glpat-|sk_live_|sk_test_|sk-|xoxb-|xoxp-|npm_|AKIA|ASIA)[A-Za-z0-9_-]{16,}$/;

const environmentVariableNameSchema = z
  .string()
  .regex(ENVIRONMENT_VARIABLE_NAME_PATTERN)
  .refine((name) => !CREDENTIAL_SHAPED_ENVIRONMENT_NAME_PATTERN.test(name));

/**
 * Validated field shapes shared by create and update, declared once and WITHOUT defaults.
 * Create layers its defaults on top; update keeps every field bare `.optional()`.
 */
const projectFields = {
  name: z.string().trim().max(120),
  githubUrl: z.string().trim().url(),
  sourceBranch: z.string().trim().min(1).max(120),
  targetBranch: z.string().trim().min(1).max(120),
  nodeVersion: z.string().trim().max(40),
  environmentMetadata: z.record(environmentVariableNameSchema, z.unknown()),
};

export const createProjectSchema = z.object({
  name: projectFields.name.optional().default(''),
  githubUrl: projectFields.githubUrl,
  sourceBranch: projectFields.sourceBranch.default('main'),
  targetBranch: projectFields.targetBranch.default('main'),
  nodeVersion: projectFields.nodeVersion.optional().default(''),
  environmentMetadata: projectFields.environmentMetadata.optional().default({}),
});

/**
 * Update carries NO defaults: an omitted key must parse to `undefined` so the use case can tell
 * "leave unchanged" from "set to the default value". Do not build this with `.partial()` over
 * `createProjectSchema` — zod keeps the inner `.default()` active, which stamps create-time
 * defaults (`''`, `'main'`, `{}`) onto every partial PATCH body and silently overwrites fields
 * the client never sent.
 */
export const updateProjectSchema = z.object({
  name: projectFields.name.optional(),
  githubUrl: projectFields.githubUrl.optional(),
  sourceBranch: projectFields.sourceBranch.optional(),
  targetBranch: projectFields.targetBranch.optional(),
  nodeVersion: projectFields.nodeVersion.optional(),
  environmentMetadata: projectFields.environmentMetadata.optional(),
});

export const organizationIdParamSchema = z.object({
  organizationId: databaseUuidSchema,
});

export const organizationProjectIdParamSchema = organizationIdParamSchema.extend({
  id: databaseUuidSchema,
});

export const optionalProjectReasonSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .max(500)
      .nullish()
      .transform((value) => value ?? ''),
  })
  .nullish()
  .transform((value) => ({ reason: value?.reason ?? '' }));

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
