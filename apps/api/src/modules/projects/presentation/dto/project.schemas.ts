import { z } from 'zod';
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js';

/** Environment metadata keys may only ever be variable names, never values. */
const ENVIRONMENT_VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * A bare credential (GitHub token, API key, cloud access key id) is identifier-shaped, so the
 * variable-name pattern alone would accept it and store the secret itself as the key name. Mirror
 * the Admin rule: a known credential prefix is only rejected when what follows it is token-shaped,
 * so a legitimate name such as `npm_package_lock_version` is not silently dropped.
 */
const CREDENTIAL_PREFIXES = [
  'ghp_',
  'gho_',
  'ghu_',
  'ghs_',
  'ghr_',
  'github_pat_',
  'glpat-',
  'sk_live_',
  'sk_test_',
  'sk-',
  'xoxb-',
  'xoxp-',
  'npm_',
  'AKIA',
  'ASIA',
];

const DIGIT_PATTERN = /[0-9]/;
const UPPERCASE_LETTER_PATTERN = /[A-Z]/;
const TOKEN_SHAPED_SUFFIX_MIN_LENGTH = 16;

/**
 * A credential prefix alone does not make a secret: length by itself would silently discard
 * legitimate names such as `npm_package_lock_version`. The suffix is treated as token material
 * only when it contains a digit AND either an uppercase letter or at least 16 characters.
 */
function isTokenShapedSuffix(suffix: string) {
  return (
    DIGIT_PATTERN.test(suffix) &&
    (UPPERCASE_LETTER_PATTERN.test(suffix) || suffix.length >= TOKEN_SHAPED_SUFFIX_MIN_LENGTH)
  );
}

function isCredentialShapedEnvironmentName(name: string) {
  const prefix = CREDENTIAL_PREFIXES.find((candidate) => name.startsWith(candidate));

  return prefix !== undefined && isTokenShapedSuffix(name.slice(prefix.length));
}

const environmentVariableNameSchema = z
  .string()
  .regex(ENVIRONMENT_VARIABLE_NAME_PATTERN)
  .refine((name) => !isCredentialShapedEnvironmentName(name));

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
