import { z } from 'zod';
import { MASKED_ENVIRONMENT_METADATA_VALUE } from '@/lib/features/project/project-schemas';
import type { Project } from '@/lib/features/project/types';

const GITHUB_REPOSITORY_SEGMENT_PATTERN = /^[A-Za-z0-9_.-]+$/;

/** A stored environment attribute may only ever be a variable name. */
const ENVIRONMENT_VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * A bare credential pasted without `=` (a GitHub token, an API key, a cloud access key id) is
 * identifier-shaped, so the variable-name filter alone would accept it and store the secret itself
 * as the key name.
 *
 * Mirrors the API's `environmentVariableNameSchema` without importing validation code across
 * applications; keep the prefix list and the suffix rule in step with it.
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

function isStorableEnvironmentVariableName(name: string) {
  return ENVIRONMENT_VARIABLE_NAME_PATTERN.test(name) && !isCredentialShapedEnvironmentName(name);
}

export type ProjectFormMessages = {
  nameMax: string;
  githubUrlRequired: string;
  githubUrlInvalid: string;
  sourceBranchRequired: string;
  targetBranchRequired: string;
  branchMax: string;
  nodeVersionMax: string;
};

/**
 * Mirrors the API's `parseGithubRepositoryUrl` rules without importing
 * validation code across applications.
 */
export function isGithubHttpsRepositoryUrl(value: string) {
  try {
    const url = new URL(value);

    if (
      url.protocol !== 'https:' ||
      url.hostname.toLowerCase() !== 'github.com' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return false;
    }

    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

    const name = parts[1].replace(/\.git$/, '');

    return GITHUB_REPOSITORY_SEGMENT_PATTERN.test(parts[0]) && GITHUB_REPOSITORY_SEGMENT_PATTERN.test(name);
  } catch {
    return false;
  }
}

export function createProjectFormSchema(messages: ProjectFormMessages) {
  return z.object({
    name: z.string().trim().max(120, messages.nameMax),
    githubUrl: z
      .string()
      .trim()
      .min(1, messages.githubUrlRequired)
      .refine(isGithubHttpsRepositoryUrl, messages.githubUrlInvalid),
    sourceBranch: z.string().trim().min(1, messages.sourceBranchRequired).max(120, messages.branchMax),
    targetBranch: z.string().trim().min(1, messages.targetBranchRequired).max(120, messages.branchMax),
    nodeVersion: z.string().trim().max(40, messages.nodeVersionMax),
    /**
     * Newline-separated environment variable names, mirroring the API field
     * name. `toProjectRequestBody` converts the names into the request record.
     */
    environmentMetadata: z.string(),
  });
}

export type ProjectFormValues = z.infer<ReturnType<typeof createProjectFormSchema>>;

export const EMPTY_PROJECT_FORM_VALUES: ProjectFormValues = {
  name: '',
  githubUrl: '',
  sourceBranch: 'main',
  targetBranch: 'main',
  nodeVersion: '',
  environmentMetadata: '',
};

export function toProjectFormValues(project: Project): ProjectFormValues {
  return {
    name: project.name,
    githubUrl: project.githubUrl,
    sourceBranch: project.sourceBranch,
    targetBranch: project.targetBranch,
    nodeVersion: project.nodeVersion ?? '',
    environmentMetadata: project.environmentMetadata ? Object.keys(project.environmentMetadata).join('\n') : '',
  };
}

/**
 * Environment variable names only; the API masks every supplied value.
 * A pasted `KEY=value` line contributes only its variable name, and any line whose name is not a
 * valid variable name is dropped, so a value can never be smuggled into a stored key. A bare
 * credential (a pasted token) is also dropped, because it is identifier-shaped and would otherwise
 * be stored verbatim as the key name.
 */
export function parseEnvironmentMetadata(value: string) {
  const names = value
    .split(/\r?\n/)
    .map(variableNameOf)
    .filter((name) => isStorableEnvironmentVariableName(name));

  return Object.fromEntries(Array.from(new Set(names)).map((name) => [name, MASKED_ENVIRONMENT_METADATA_VALUE]));
}

function variableNameOf(line: string) {
  const separatorIndex = line.indexOf('=');

  return (separatorIndex === -1 ? line : line.slice(0, separatorIndex)).trim();
}

export function toProjectRequestBody(values: ProjectFormValues) {
  return {
    name: values.name.trim(),
    githubUrl: values.githubUrl.trim(),
    sourceBranch: values.sourceBranch.trim(),
    targetBranch: values.targetBranch.trim(),
    nodeVersion: values.nodeVersion.trim(),
    environmentMetadata: parseEnvironmentMetadata(values.environmentMetadata),
  };
}
