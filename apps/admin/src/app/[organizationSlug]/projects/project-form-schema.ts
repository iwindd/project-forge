import { z } from 'zod'
import type { Project } from '@/lib/features/project/types'

/** Value the API stores for every environment variable key it accepts. */
export const MASKED_ENVIRONMENT_METADATA_VALUE = 'configured'

const GITHUB_REPOSITORY_SEGMENT_PATTERN = /^[A-Za-z0-9_.-]+$/

/** A stored environment attribute may only ever be a variable name. */
const ENVIRONMENT_VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

export type ProjectFormMessages = {
  nameMax: string
  githubUrlRequired: string
  githubUrlInvalid: string
  sourceBranchRequired: string
  targetBranchRequired: string
  branchMax: string
  nodeVersionMax: string
}

/**
 * Mirrors the API's `parseGithubRepositoryUrl` rules without importing
 * validation code across applications.
 */
export function isGithubHttpsRepositoryUrl(value: string) {
  try {
    const url = new URL(value)

    if (
      url.protocol !== 'https:' ||
      url.hostname.toLowerCase() !== 'github.com' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return false
    }

    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length !== 2 || !parts[0] || !parts[1]) return false

    const name = parts[1].replace(/\.git$/, '')

    return (
      GITHUB_REPOSITORY_SEGMENT_PATTERN.test(parts[0]) &&
      GITHUB_REPOSITORY_SEGMENT_PATTERN.test(name)
    )
  } catch {
    return false
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
    sourceBranch: z
      .string()
      .trim()
      .min(1, messages.sourceBranchRequired)
      .max(120, messages.branchMax),
    targetBranch: z
      .string()
      .trim()
      .min(1, messages.targetBranchRequired)
      .max(120, messages.branchMax),
    nodeVersion: z.string().trim().max(40, messages.nodeVersionMax),
    /**
     * Newline-separated environment variable names, mirroring the API field
     * name. `toProjectRequestBody` converts the names into the request record.
     */
    environmentMetadata: z.string()
  })
}

export type ProjectFormValues = z.infer<
  ReturnType<typeof createProjectFormSchema>
>

export const EMPTY_PROJECT_FORM_VALUES: ProjectFormValues = {
  name: '',
  githubUrl: '',
  sourceBranch: 'main',
  targetBranch: 'main',
  nodeVersion: '',
  environmentMetadata: ''
}

export function toProjectFormValues(project: Project): ProjectFormValues {
  return {
    name: project.name,
    githubUrl: project.githubUrl,
    sourceBranch: project.sourceBranch,
    targetBranch: project.targetBranch,
    nodeVersion: project.nodeVersion ?? '',
    environmentMetadata: project.environmentMetadata
      ? Object.keys(project.environmentMetadata).join('\n')
      : ''
  }
}

/**
 * Environment variable names only; the API masks every supplied value.
 * A pasted `KEY=value` line contributes only its variable name, and any line
 * whose name is not a valid variable name is dropped, so a value can never be
 * smuggled into a stored key.
 */
export function parseEnvironmentMetadata(value: string) {
  const names = value
    .split(/\r?\n/)
    .map(variableNameOf)
    .filter(name => ENVIRONMENT_VARIABLE_NAME_PATTERN.test(name))

  return Object.fromEntries(
    Array.from(new Set(names)).map(name => [
      name,
      MASKED_ENVIRONMENT_METADATA_VALUE
    ])
  )
}

function variableNameOf(line: string) {
  const separatorIndex = line.indexOf('=')

  return (separatorIndex === -1 ? line : line.slice(0, separatorIndex)).trim()
}

export function toProjectRequestBody(values: ProjectFormValues) {
  return {
    name: values.name.trim(),
    githubUrl: values.githubUrl.trim(),
    sourceBranch: values.sourceBranch.trim(),
    targetBranch: values.targetBranch.trim(),
    nodeVersion: values.nodeVersion.trim(),
    environmentMetadata: parseEnvironmentMetadata(values.environmentMetadata)
  }
}
