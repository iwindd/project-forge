import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
  type FetchBaseQueryMeta,
} from '@reduxjs/toolkit/query/react';
import { setUser } from '@/lib/features/auth/auth-slice';
import { apiErrorResponseSchema, isApiSuccessResponse, type ApiErrorResponse, type ApiMeta } from './contracts';

const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5050';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${apiOrigin}/api/v1/`,
  credentials: 'include',
  cache: 'no-store',
});

export type BrowserApiMeta = FetchBaseQueryMeta & {
  apiMeta?: ApiMeta;
};

export type BrowserApiError = Omit<FetchBaseQueryError, 'data'> & {
  data: ApiErrorResponse;
};

export function getBrowserApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;

  const parsed = apiErrorResponseSchema.safeParse(
    typeof error === 'object' && error !== null && 'data' in error ? error.data : undefined,
  );

  return parsed.success ? parsed.data.error.message : fallback;
}

function normalizeApiError(error: FetchBaseQueryError, meta?: FetchBaseQueryMeta): BrowserApiError {
  const parsed = apiErrorResponseSchema.safeParse(error.data);
  if (parsed.success) return { ...error, data: parsed.data };

  const status = typeof error.status === 'number' ? error.status : null;
  const requestId = meta?.response?.headers.get('x-request-id') ?? 'unknown';

  return {
    ...error,
    data: {
      error: {
        code: 'API_REQUEST_FAILED',
        message: status ? `API request failed with ${status}` : 'API request failed',
        details: error.data ?? {},
        requestId,
      },
    },
  };
}

export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, BrowserApiError, object, BrowserApiMeta> = async (
  args,
  apiContext,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, apiContext, extraOptions);

  if (result.error) {
    const error = normalizeApiError(result.error, result.meta);

    if (error.status === 401) {
      apiContext.dispatch(setUser(null));
      apiContext.dispatch(api.util.resetApiState());

      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        const returnTo = window.location.pathname + window.location.search;
        window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      }
    }

    return { ...result, error };
  }

  if (isApiSuccessResponse(result.data)) {
    return {
      data: result.data.data,
      ...(result.meta ? { meta: { ...result.meta, apiMeta: result.data.meta } } : {}),
    };
  }

  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'AuditLogs',
    'OrganizationMembers',
    'OrganizationInvitations',
    'OrganizationRoles',
    'Organizations',
    'Projects',
    'Profile',
    'HermesRuntime',
    'SecurityLogs',
  ],
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
