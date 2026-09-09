import { api } from '@/lib/api/api'
import type { BrowserApiMeta } from '@/lib/api/api'
import type { UserListQuery, UserListResult } from '@/servers/user/types'

type ApiUserListItem = {
  id: string
  name: string | null
  email: string | null
  role:
    | 'ADMIN'
    | 'EDITOR'
    | 'OWNER'
    | 'MEMBER'
    | {
        legacyRole: 'OWNER' | 'ADMIN' | 'MEMBER' | null
        isOwner: boolean
      }
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type ApiOrganizationMemberListResult = {
  data: ApiUserListItem[]
  total: number
  page: number
  pageSize: number
}

type GetUsersArg = {
  organizationId?: string
  query: UserListQuery
}

function toUserListItem(user: ApiUserListItem): UserListResult['data'][number] {
  const isAdmin =
    typeof user.role === 'string'
      ? user.role === 'ADMIN' || user.role === 'OWNER'
      : user.role.isOwner || user.role.legacyRole === 'ADMIN'

  return {
    id: user.id,
    name: user.name ?? user.email ?? user.id,
    email: user.email ?? '',
    role: isAdmin ? 'ADMIN' : 'EDITOR',
    isActive: user.isActive,
    createdAt: user.createdAt
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
      transformResponse: (
        response: ApiUserListItem[] | ApiOrganizationMemberListResult,
        meta: BrowserApiMeta | undefined
      ): UserListResult => {
        if (Array.isArray(response)) {
          const total =
            typeof meta?.apiMeta?.total === 'number'
              ? meta.apiMeta.total
              : response.length
          return { data: response.map(toUserListItem), total }
        }

        return {
          data: response.data.map(toUserListItem),
          total: response.total
        }
      },
      providesTags: ['Users']
    })
  }),
  overrideExisting: false
})

export const { useGetUsersQuery } = usersApi
