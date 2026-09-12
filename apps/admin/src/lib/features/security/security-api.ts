import { api, type BrowserApiMeta } from '@/lib/api/api'
import { z } from 'zod'

const securityLogSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().nullable(),
  userId: z.string().nullable(),
  event: z.string().min(1),
  provider: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.string().min(1)
})

const securityLogsMetaSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number()
})

export type SecurityLog = z.infer<typeof securityLogSchema>

export type SecurityLogsResult = {
  data: SecurityLog[]
  total: number
  page: number
  pageSize: number
}

export type SecurityLogsArg =
  | { userId?: never; organizationId?: never }
  | { userId: string; organizationId: string }

export function getSecurityLogsTag(arg: SecurityLogsArg) {
  return {
    type: 'SecurityLogs' as const,
    id: 'userId' in arg && arg.userId
      ? `${arg.organizationId}:${arg.userId}`
      : 'own'
  }
}

export function parseSecurityLogsResponse(
  response: unknown,
  meta: Pick<BrowserApiMeta, 'apiMeta'> | undefined
): SecurityLogsResult {
  const logs = z.array(securityLogSchema).parse(response)
  const parsedMeta = securityLogsMetaSchema.parse(meta?.apiMeta)

  return {
    data: logs,
    total: parsedMeta.total,
    page: parsedMeta.page,
    pageSize: parsedMeta.pageSize
  }
}

export const securityApi = api.injectEndpoints({
  endpoints: builder => ({
    getSecurityLogs: builder.query<SecurityLogsResult, SecurityLogsArg>({
      query: ({ organizationId, userId }) => ({
        url: userId
          ? `audit-logs/security/organization/${encodeURIComponent(organizationId ?? '')}/users/${encodeURIComponent(userId)}`
          : 'audit-logs/security/me'
      }),
      transformResponse: parseSecurityLogsResponse,
      providesTags: (_result, _error, arg) => [getSecurityLogsTag(arg)]
    })
  }),
  overrideExisting: false
})

export const { useGetSecurityLogsQuery } = securityApi
