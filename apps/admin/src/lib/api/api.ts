import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
  type FetchBaseQueryMeta
} from '@reduxjs/toolkit/query/react'
import { setUser } from '@/lib/features/auth/auth-slice'
import { isApiSuccessResponse, type ApiMeta } from './contracts'

const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5050'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${apiOrigin}/api/v1/`,
  credentials: 'include',
  cache: 'no-store'
})

export type BrowserApiMeta = FetchBaseQueryMeta & {
  apiMeta?: ApiMeta
}

export const baseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  object,
  BrowserApiMeta
> = async (args, apiContext, extraOptions) => {
  const result = await rawBaseQuery(args, apiContext, extraOptions)

  if (result.error) {
    if (result.error.status === 401) {
      apiContext.dispatch(setUser(null))
      apiContext.dispatch(api.util.resetApiState())

      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/admin/login')
      ) {
        window.location.replace('/admin/login')
      }
    }

    return result
  }

  if (isApiSuccessResponse(result.data)) {
    return {
      data: result.data.data,
      ...(result.meta
        ? { meta: { ...result.meta, apiMeta: result.data.meta } }
        : {})
    }
  }

  return result
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'Users',
    'AuditLogs',
    'OrganizationMembers',
    'OrganizationInvitations',
    'OrganizationRoles',
    'Organizations'
  ],
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({})
})
