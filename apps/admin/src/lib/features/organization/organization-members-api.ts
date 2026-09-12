import { api, type BrowserApiMeta } from '@/lib/api/api'
import { z } from 'zod'
import {
  acceptInvitationResponseSchema,
  organizationInvitationSchema,
  organizationInvitationResponseSchema,
  organizationMemberSchema,
  organizationMemberRoleResponseSchema,
  organizationMemberUserResponseSchema,
  organizationMembersMetaSchema,
  organizationRoleSchema,
  organizationRoleResponseSchema,
  organizationRolesMetaSchema,
  organizationRoleSummarySchema,
  nullResponseSchema,
  okResponseSchema
} from './organization-schemas'
export type { OrganizationRole } from './types'

type OrganizationPermission = 'organization.manage' | 'project.manage'

export type OrganizationRoleSummary = z.infer<
  typeof organizationRoleSummarySchema
>

export type OrganizationMember = z.infer<typeof organizationMemberSchema>

export type OrganizationMemberUser = z.infer<
  typeof organizationMemberUserResponseSchema
>['user']

export type OrganizationInvitation = z.infer<typeof organizationInvitationSchema>

export type OrganizationMembersQuery = {
  search?: string
  roleId?: string
  status?: 'active' | 'inactive'
  page?: number
  pageSize?: number
  sortBy?: 'name' | 'role' | 'createdAt'
  sortDirection?: 'asc' | 'desc'
}

type OrganizationMembersResponse = {
  data: OrganizationMember[]
  total: number
  page: number
  pageSize: number
}

type OrganizationRolesResponse = {
  data: OrganizationRoleSummary[]
  availablePermissions: Array<{ key: OrganizationPermission }>
}

type CreateInvitationResponse = z.infer<
  typeof organizationInvitationResponseSchema
>

type AcceptInvitationInput = {
  token: string
}

type AcceptInvitationResponse = z.infer<typeof acceptInvitationResponseSchema>

type CreateInvitationInput = {
  organizationId: string
  email: string
  roleId: string
}

type CancelInvitationInput = {
  organizationId: string
  invitationId: string
}

type UpdateMemberRoleInput = {
  organizationId: string
  userId: string
  roleId: string
}

type UpdateMemberStatusInput = {
  organizationId: string
  userId: string
  active: boolean
}

type RemoveMemberInput = {
  organizationId: string
  userId: string
}

type CreateRoleInput = {
  organizationId: string
  name: string
  permissions: OrganizationPermission[]
}

type UpdateRoleInput = {
  organizationId: string
  roleId: string
  name?: string
  permissions?: OrganizationPermission[]
}

type DeleteRoleInput = {
  organizationId: string
  roleId: string
}

type ApiMetaCarrier = Pick<BrowserApiMeta, 'apiMeta'>

export function parseRoleResponse(
  response: unknown,
  meta: ApiMetaCarrier | undefined
): OrganizationRolesResponse {
  const roles = z.array(organizationRoleSummarySchema).parse(response)
  const parsedMeta = organizationRolesMetaSchema.parse(meta?.apiMeta)
  return { data: roles, availablePermissions: parsedMeta.availablePermissions }
}

export function parseMembersResponse(
  response: unknown,
  meta: ApiMetaCarrier | undefined
): OrganizationMembersResponse {
  const members = z.array(organizationMemberSchema).parse(response)
  const parsedMeta = organizationMembersMetaSchema.parse(meta?.apiMeta)
  return { data: members, ...parsedMeta }
}

export function parseAcceptInvitationResponse(
  response: unknown
): AcceptInvitationResponse {
  return acceptInvitationResponseSchema.parse(response)
}

export function parseRoleMutationResponse(response: unknown) {
  return organizationRoleResponseSchema.parse(response)
}

export function parseCreateInvitationResponse(response: unknown) {
  return organizationInvitationResponseSchema.parse(response)
}

export function parseOkResponse(response: unknown) {
  return okResponseSchema.parse(response)
}

export function parseCancelInvitationResponse(response: unknown) {
  return nullResponseSchema.parse(response)
}

export function parseMemberUserResponse(response: unknown): {
  user: OrganizationMemberUser
} {
  return organizationMemberUserResponseSchema.parse(response)
}

export function parseMemberRoleResponse(response: unknown): {
  membership: OrganizationMemberUser
} {
  return organizationMemberRoleResponseSchema.parse(response)
}

export const organizationMembersApi = api.injectEndpoints({
  endpoints: builder => ({
    getRoles: builder.query<OrganizationRolesResponse, { organizationId: string }>({
      query: ({ organizationId }) =>
        `organizations/${encodeURIComponent(organizationId)}/roles`,
      transformResponse: parseRoleResponse,
      providesTags: (_result, _error, { organizationId }) => [
        { type: 'OrganizationRoles', id: organizationId }
      ]
    }),
    createRole: builder.mutation<
      { role: z.infer<typeof organizationRoleSchema> },
      CreateRoleInput
    >({
      query: ({ organizationId, name, permissions }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/roles`,
        method: 'POST',
        body: { name, permissions }
      }),
      transformResponse: parseRoleMutationResponse,
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: 'OrganizationRoles', id: organizationId }
      ]
    }),
    updateRole: builder.mutation<
      { role: z.infer<typeof organizationRoleSchema> },
      UpdateRoleInput
    >({
      query: ({ organizationId, roleId, name, permissions }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/roles/${encodeURIComponent(roleId)}`,
        method: 'PATCH',
        body: { name, permissions }
      }),
      transformResponse: parseRoleMutationResponse,
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: 'OrganizationRoles', id: organizationId },
        { type: 'OrganizationMembers', id: organizationId },
        { type: 'OrganizationInvitations', id: organizationId }
      ]
    }),
    deleteRole: builder.mutation<{ ok: true }, DeleteRoleInput>({
      query: ({ organizationId, roleId }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/roles/${encodeURIComponent(roleId)}`,
        method: 'DELETE'
      }),
      transformResponse: parseOkResponse,
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: 'OrganizationRoles', id: organizationId }
      ]
    }),
    getMembers: builder.query<
      OrganizationMembersResponse,
      { organizationId: string; query: OrganizationMembersQuery }
    >({
      query: ({ organizationId, query }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/members`,
        params: query
      }),
      transformResponse: parseMembersResponse,
      providesTags: (_result, _error, { organizationId }) => [
        { type: 'OrganizationMembers', id: organizationId }
      ]
    }),
    getInvitations: builder.query<OrganizationInvitation[], { organizationId: string }>({
      query: ({ organizationId }) =>
        `organizations/${encodeURIComponent(organizationId)}/invitations`,
      transformResponse: (response: unknown) =>
        z.array(organizationInvitationSchema).parse(response),
      providesTags: (_result, _error, { organizationId }) => [
        { type: 'OrganizationInvitations', id: organizationId }
      ]
    }),
    createInvitation: builder.mutation<CreateInvitationResponse, CreateInvitationInput>({
      query: ({ organizationId, email, roleId }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/invitations`,
        method: 'POST',
        body: { email, roleId }
      }),
      transformResponse: parseCreateInvitationResponse,
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: 'OrganizationInvitations', id: organizationId },
        { type: 'OrganizationRoles', id: organizationId }
      ]
    }),
    cancelInvitation: builder.mutation<null, CancelInvitationInput>({
      query: ({ organizationId, invitationId }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/invitations/${encodeURIComponent(invitationId)}`,
        method: 'DELETE'
      }),
      transformResponse: parseCancelInvitationResponse,
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: 'OrganizationInvitations', id: organizationId },
        { type: 'OrganizationRoles', id: organizationId }
      ]
    }),
    updateMemberRole: builder.mutation<
      { membership: OrganizationMemberUser },
      UpdateMemberRoleInput
    >({
      query: ({ organizationId, userId, roleId }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
        method: 'PATCH',
        body: { roleId }
      }),
      transformResponse: parseMemberRoleResponse,
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: 'OrganizationMembers', id: organizationId },
        { type: 'OrganizationRoles', id: organizationId }
      ]
    }),
    updateMemberStatus: builder.mutation<
      { user: OrganizationMemberUser },
      UpdateMemberStatusInput
    >({
      query: ({ organizationId, userId, active }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}/status`,
        method: 'PATCH',
        body: { active }
      }),
      transformResponse: parseMemberUserResponse,
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: 'OrganizationMembers', id: organizationId }
      ]
    }),
    removeMember: builder.mutation<{ ok: true }, RemoveMemberInput>({
      query: ({ organizationId, userId }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
        method: 'DELETE'
      }),
      transformResponse: parseOkResponse,
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: 'OrganizationMembers', id: organizationId },
        { type: 'OrganizationRoles', id: organizationId }
      ]
    }),
    acceptInvitation: builder.mutation<
      AcceptInvitationResponse,
      AcceptInvitationInput
    >({
      query: ({ token }) => ({
        url: `organizations/invitations/${encodeURIComponent(token)}/accept`,
        method: 'POST'
      }),
      transformResponse: parseAcceptInvitationResponse,
      invalidatesTags: ['Organizations', 'OrganizationInvitations']
    })
  }),
  overrideExisting: false
})

export const {
  useCancelInvitationMutation,
  useCreateInvitationMutation,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useAcceptInvitationMutation,
  useGetInvitationsQuery,
  useGetMembersQuery,
  useGetRolesQuery,
  useRemoveMemberMutation,
  useUpdateMemberRoleMutation,
  useUpdateMemberStatusMutation,
  useUpdateRoleMutation
} = organizationMembersApi
