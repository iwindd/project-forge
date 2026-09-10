import { z } from 'zod'
import type { Project } from './types'

const postgresUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** PostgreSQL accepts any canonical UUID-shaped value, not only RFC UUID versions. */
export const databaseUuidSchema = z.string().regex(postgresUuidPattern)

export const projectSchema = z.object({
  id: databaseUuidSchema,
  organizationId: databaseUuidSchema,
  name: z.string().min(1),
  githubUrl: z.url(),
  githubOwner: z.string().min(1),
  githubRepo: z.string().min(1),
  sourceBranch: z.string().min(1),
  targetBranch: z.string().min(1),
  nodeVersion: z.string().nullable(),
  environmentMetadata: z.record(z.string(), z.string()).nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  archivedAt: z.string().nullable()
}) satisfies z.ZodType<Project>

/** Wire shape of `GET /organizations/:organizationId/projects`. */
export const projectListResponseSchema = z.object({
  data: z.array(projectSchema)
})

/** Wire shape of every Project mutation response. */
export const projectResponseEnvelopeSchema = z.object({
  data: z.object({
    project: projectSchema
  })
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/*
 * The RTK Query base query unwraps the standard `data` envelope before
 * `transformResponse` runs, so each parser accepts both the documented wire
 * shape and the already-unwrapped payload it receives.
 */
function toDocumentedEnvelope(response: unknown) {
  return isRecord(response) && 'data' in response ? response : { data: response }
}

export function parseProjectListResponse(response: unknown): Project[] {
  return projectListResponseSchema.parse(toDocumentedEnvelope(response)).data
}

export function parseProjectResponse(response: unknown): { project: Project } {
  return projectResponseEnvelopeSchema.parse(toDocumentedEnvelope(response))
    .data
}
