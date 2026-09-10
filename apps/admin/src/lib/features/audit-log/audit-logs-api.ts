import { api, type BrowserApiMeta } from '@/lib/api/api'
import type {
  AuditLogListQuery,
  AuditLogListResult
} from '@/servers/audit-log/types'
import { z } from 'zod'

const auditLogUserSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string()
})

const auditLogListItemSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  action: z.string().min(1),
  resourceType: z.string().min(1),
  resourceId: z.string().nullable(),
  actorRole: z.enum(['ADMIN', 'USER']).nullable(),
  actor: auditLogUserSchema.nullable(),
  target: auditLogUserSchema.nullable(),
  reason: z.string().nullable(),
  hasBefore: z.boolean(),
  hasAfter: z.boolean()
})

const auditLogMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number()
})

export function parseAuditLogsResponse(
  response: unknown,
  meta: Pick<BrowserApiMeta, 'apiMeta'> | undefined
): AuditLogListResult {
  const records = z.array(auditLogListItemSchema).parse(response)
  const parsedMeta = auditLogMetaSchema.parse(meta?.apiMeta)

  return { data: records, total: parsedMeta.total }
}

/** Which timeline to read. The server re-derives every scope it can. */
export type AuditLogScopeArg =
  | { kind: 'all' }
  | { kind: 'user'; userId: string }
  | { kind: 'own' }

function getAuditLogListUrl(
  scope: AuditLogScopeArg,
  organizationId?: string
) {
  if (organizationId && scope.kind === 'user') {
    return `audit-logs/organization/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(scope.userId)}`
  }
  if (organizationId && scope.kind === 'all') {
    return `audit-logs/organization/${encodeURIComponent(organizationId)}`
  }
  if (scope.kind === 'user') {
    return `audit-logs/users/${encodeURIComponent(scope.userId)}`
  }

  return scope.kind === 'own' ? 'audit-logs/me' : 'audit-logs'
}

export function getAuditLogExportPath(
  scope: AuditLogScopeArg,
  id: string,
  organizationId?: string
) {
  const base = scope.kind === 'own'
    ? 'audit-logs/me'
      : organizationId
      ? `audit-logs/organization/${encodeURIComponent(organizationId)}`
      : 'audit-logs'

  return `${base}/${encodeURIComponent(id)}/export`
}

export async function parseAuditLogExportResponse(
  response: Response
): Promise<string | unknown> {
  // Keep the successful payload serializable while RTK Query stores the
  // mutation result. The component turns this JSON string into a Blob only
  // at the point where the browser download is started.
  if (response.ok) return response.text()

  const body = await response.text()
  if (!body) return {}

  try {
    return JSON.parse(body) as unknown
  } catch {
    return body
  }
}

export type AuditLogExportArgs = {
  scope: AuditLogScopeArg
  auditLogId: string
  organizationId?: string
}

/** Multi-value filters travel as comma-separated lists. */
function toRequestParams(query: AuditLogListQuery) {
  const { actions, resourceTypes, pageSize, ...rest } = query

  return {
    ...rest,
    limit: pageSize,
    ...(actions?.length ? { actions: actions.join(',') } : {}),
    ...(resourceTypes?.length
      ? { resourceTypes: resourceTypes.join(',') }
      : {})
  }
}

export const auditLogsApi = api.injectEndpoints({
  endpoints: builder => ({
    getAuditLogs: builder.query<
      AuditLogListResult,
      {
        scope: AuditLogScopeArg
        query: AuditLogListQuery
        organizationId?: string
      }
    >({
      query: ({ scope, query, organizationId }) => ({
        url: getAuditLogListUrl(scope, organizationId),
        params: toRequestParams(query)
      }),
      transformResponse: parseAuditLogsResponse,
      providesTags: ['AuditLogs']
    }),
    exportAuditLog: builder.mutation<string, AuditLogExportArgs>({
      query: ({ scope, auditLogId, organizationId }) => ({
        url: getAuditLogExportPath(scope, auditLogId, organizationId),
        method: 'GET',
        cache: 'no-store',
        responseHandler: parseAuditLogExportResponse
      })
    })
  }),
  overrideExisting: false
})

export const { useExportAuditLogMutation, useGetAuditLogsQuery } = auditLogsApi
