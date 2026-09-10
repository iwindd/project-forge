import { api } from '@/lib/api/api'
import {
  parseProjectListResponse,
  parseProjectResponse
} from './project-schemas'
import type {
  ArchiveProjectInput,
  CreateProjectInput,
  Project,
  RestoreProjectInput,
  UpdateProjectInput
} from './types'

export const projectApi = api.injectEndpoints({
  endpoints: builder => ({
    getProjects: builder.query<Project[], { organizationId: string }>({
      query: ({ organizationId }) =>
        `organizations/${encodeURIComponent(organizationId)}/projects`,
      transformResponse: parseProjectListResponse,
      providesTags: (_result, _error, { organizationId }) => [
        { type: 'Projects', id: organizationId }
      ]
    }),
    createProject: builder.mutation<{ project: Project }, CreateProjectInput>({
      query: ({ organizationId, ...body }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/projects`,
        method: 'POST',
        body
      }),
      transformResponse: parseProjectResponse,
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: 'Projects', id: organizationId }
      ]
    }),
    updateProject: builder.mutation<{ project: Project }, UpdateProjectInput>({
      query: ({ organizationId, projectId, ...body }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}`,
        method: 'PATCH',
        body
      }),
      transformResponse: parseProjectResponse,
      invalidatesTags: (_result, _error, { organizationId, projectId }) => [
        { type: 'Projects', id: organizationId },
        { type: 'Projects', id: projectId }
      ]
    }),
    archiveProject: builder.mutation<{ project: Project }, ArchiveProjectInput>({
      query: ({ organizationId, projectId, reason }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/archive`,
        method: 'POST',
        body: { reason }
      }),
      transformResponse: parseProjectResponse,
      invalidatesTags: (_result, _error, { organizationId, projectId }) => [
        { type: 'Projects', id: organizationId },
        { type: 'Projects', id: projectId }
      ]
    }),
    restoreProject: builder.mutation<{ project: Project }, RestoreProjectInput>({
      query: ({ organizationId, projectId, reason }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/restore`,
        method: 'POST',
        body: { reason }
      }),
      transformResponse: parseProjectResponse,
      invalidatesTags: (_result, _error, { organizationId, projectId }) => [
        { type: 'Projects', id: organizationId },
        { type: 'Projects', id: projectId }
      ]
    })
  }),
  overrideExisting: false
})

export const {
  useArchiveProjectMutation,
  useCreateProjectMutation,
  useGetProjectsQuery,
  useRestoreProjectMutation,
  useUpdateProjectMutation
} = projectApi
