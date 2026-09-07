import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { AccessRequest, Project, User } from '@/lib/api';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3007/api/v1').replace(/\/$/, '');

type UsersResponse = {
  data: User[];
  total: number;
  page: number;
  limit: number;
};

export type ProjectInput = {
  name?: string;
  githubUrl: string;
  sourceBranch: string;
  targetBranch: string;
  nodeVersion?: string;
  environmentMetadata?: Record<string, string>;
};

export const projectForgeApi = createApi({
  reducerPath: 'projectForgeApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL, credentials: 'include', cache: 'no-store' }),
  tagTypes: ['Me', 'Projects', 'Users', 'AccessRequests'],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getMe: builder.query<{ user: User }, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
    logout: builder.mutation<{ ok: boolean }, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['Me'],
    }),
    requestAccess: builder.mutation<{ request: AccessRequest }, string>({
      query: (reason) => ({ url: '/access-requests', method: 'POST', body: { reason } }),
      invalidatesTags: ['Me', 'AccessRequests'],
    }),
    getProjects: builder.query<{ projects: Project[] }, void>({
      query: () => '/projects',
      providesTags: (result) => [
        'Projects',
        ...(result?.projects.map(({ id }) => ({ type: 'Projects' as const, id })) ?? []),
      ],
    }),
    getProject: builder.query<{ project: Project }, string>({
      query: (id) => `/projects/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Projects', id }],
    }),
    createProject: builder.mutation<{ project: Project }, ProjectInput>({
      query: (body) => ({
        url: '/projects',
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': globalThis.crypto?.randomUUID?.() ?? `${Date.now()}` },
      }),
      invalidatesTags: ['Projects'],
    }),
    updateProject: builder.mutation<{ project: Project }, { id: string; body: ProjectInput }>({
      query: ({ id, body }) => ({ url: `/projects/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => ['Projects', { type: 'Projects', id }],
    }),
    archiveProject: builder.mutation<{ project: Project }, string>({
      query: (id) => ({ url: `/projects/${id}/archive`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => ['Projects', { type: 'Projects', id }],
    }),
    getUsers: builder.query<UsersResponse, { search?: string; status?: string }>({
      query: ({ search = '', status = '' }) => ({
        url: '/admin/users',
        params: { ...(search ? { search } : {}), ...(status ? { status } : {}) },
      }),
      providesTags: ['Users'],
    }),
    updateUserStatus: builder.mutation<{ user: User }, { id: string; status: User['accessStatus']; reason?: string }>({
      query: ({ id, status, reason = '' }) => ({
        url: `/admin/users/${id}/status`,
        method: 'PATCH',
        body: { status, reason },
      }),
      invalidatesTags: ['Users', 'AccessRequests'],
    }),
    updateUserRole: builder.mutation<{ user: User }, { id: string; role: User['role']; reason?: string }>({
      query: ({ id, role, reason = '' }) => ({
        url: `/admin/users/${id}/role`,
        method: 'PATCH',
        body: { role, reason },
      }),
      invalidatesTags: ['Users'],
    }),
    revokeUserSessions: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/admin/users/${id}/revoke-sessions`, method: 'POST' }),
      invalidatesTags: ['Users'],
    }),
    getAccessRequests: builder.query<{ requests: AccessRequest[] }, void>({
      query: () => '/access-requests',
      providesTags: ['AccessRequests'],
    }),
    decideAccess: builder.mutation<unknown, { id: string; decision: 'approve' | 'reject'; note?: string }>({
      query: ({ id, decision, note = '' }) => ({
        url: `/access-requests/${id}/${decision}`,
        method: 'POST',
        body: { note },
      }),
      invalidatesTags: ['AccessRequests', 'Users'],
    }),
  }),
});

export const {
  useGetMeQuery,
  useLogoutMutation,
  useRequestAccessMutation,
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useArchiveProjectMutation,
  useGetUsersQuery,
  useUpdateUserStatusMutation,
  useUpdateUserRoleMutation,
  useRevokeUserSessionsMutation,
  useGetAccessRequestsQuery,
  useDecideAccessMutation,
} = projectForgeApi;
