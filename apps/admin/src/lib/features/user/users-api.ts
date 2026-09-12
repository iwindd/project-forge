import { api } from '@/lib/api/api'
import type { BrowserApiMeta } from '@/lib/api/api'
import {
  normalizeUserRole,
  userRoleSchema
} from '@/servers/user/schemas'
import type { UserListQuery, UserListResult } from '@/servers/user/types'
import { z } from 'zod'

const apiUserListItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable(),
  email: z.string().nullable(),
  role: userRoleSchema,
  isActive: z.boolean(),
  accessStatus: z.string().optional(),
  githubLogin: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1).optional()
})

const legacyPaginatedUsersSchema = z.object({
  data: z.array(apiUserListItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive()
})

const apiUserListResponseSchema = z.union([
  z.array(apiUserListItemSchema),
  legacyPaginatedUsersSchema
])

const apiPaginationMetaSchema = z
  .object({ total: z.number().int().nonnegative() })
  .passthrough()

type GetUsersArg = {
  organizationId?: string
  query: UserListQuery
}

export function getUsersTag(organizationId?: string) {
  return { type: 'Users' as const, id: organizationId ?? 'platform' }
}

function toUserListItem(
  user: z.infer<typeof apiUserListItemSchema>
): UserListResult['data'][number] {
  return {
    id: user.id,
    name: user.name ?? user.email ?? user.id,
    email: user.email ?? '',
    role: normalizeUserRole(user.role),
    isActive: user.isActive,
    createdAt: user.createdAt
  }
}

export function parseUsersResponse(
  response: unknown,
  meta: Pick<BrowserApiMeta, 'apiMeta'> | undefined
): UserListResult {
  const parsed = apiUserListResponseSchema.parse(response)

  if (Array.isArray(parsed)) {
    const parsedMeta = apiPaginationMetaSchema.safeParse(meta?.apiMeta)
    return {
      data: parsed.map(toUserListItem),
      total: parsedMeta.success ? parsedMeta.data.total : parsed.length
    }
  }

  return {
    data: parsed.data.map(toUserListItem),
    total: parsed.total
  }
}

export const usersApi = api.injectEndpoints({
  endpoints: builder => ({
    getUsers: builder.query<UserListResult, GetUsersArg>({
      query: ({ organizationId, query }) => ({
        url: organizationId
          ? `organizations/${encodeURIComponent(organizationId)}/members`
          : 'admin/users',
        params: query
      }),
      transformResponse: parseUsersResponse,
      providesTags: (_result, _error, { organizationId }) => [
        getUsersTag(organizationId)
      ]
    })
  }),
  overrideExisting: false
})

export const { useGetUsersQuery } = usersApi
