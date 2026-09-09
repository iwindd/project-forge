import { api } from '@/lib/api/api'
import type { OrganizationMemberRole, OrganizationRole } from './types'
export type { OrganizationRole } from './types'

type OrganizationPermission = "organization.manage";

export type OrganizationRoleSummary = OrganizationRole & {
  memberCount?: number;
  invitationCount?: number;
};

type OrganizationMemberStatus =
  | "ACTIVE"
  | "INVITED"
  | "SUSPENDED"
  | "REMOVED";

export type OrganizationMember = {
  id: string;
  membershipId: string;
  name: string;
  email: string | null;
  role: OrganizationRole;
  status: OrganizationMemberStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type OrganizationInvitation = {
  id: string;
  organizationId: string;
  email: string | null;
  role: OrganizationRole;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
  createdAt: string;
};

export type OrganizationMembersQuery = {
  search?: string;
  role?: OrganizationMemberRole;
  roleId?: string;
  status?: "active" | "inactive";
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "role" | "createdAt";
  sortDirection?: "asc" | "desc";
};

type OrganizationMembersResponse = {
  data: OrganizationMember[];
  total: number;
  page: number;
  pageSize: number;
};

type OrganizationRolesResponse = {
  data: OrganizationRoleSummary[];
  availablePermissions: Array<{ key: OrganizationPermission }>;
};

type CreateInvitationResponse = {
  invitation: OrganizationInvitation;
  token: string;
};

type CreateInvitationInput = {
  organizationId: string;
  email?: string | null;
  roleId: string;
};

type UpdateMemberRoleInput = {
  organizationId: string;
  userId: string;
  roleId: string;
};

type UpdateMemberStatusInput = {
  organizationId: string;
  userId: string;
  active: boolean;
};

type RemoveMemberInput = {
  organizationId: string;
  userId: string;
};

type CreateRoleInput = {
  organizationId: string;
  name: string;
  permissions: OrganizationPermission[];
};

type UpdateRoleInput = {
  organizationId: string;
  roleId: string;
  name?: string;
  permissions?: OrganizationPermission[];
};

type DeleteRoleInput = {
  organizationId: string;
  roleId: string;
};

export const organizationMembersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getRoles: builder.query<OrganizationRolesResponse, { organizationId: string }>({
      query: ({ organizationId }) =>
        `organizations/${encodeURIComponent(organizationId)}/roles`,
      providesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationRoles", id: organizationId },
      ],
    }),
    createRole: builder.mutation<{ role: OrganizationRole }, CreateRoleInput>({
      query: ({ organizationId, name, permissions }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/roles`,
        method: "POST",
        body: { name, permissions },
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationRoles", id: organizationId },
      ],
    }),
    updateRole: builder.mutation<{ role: OrganizationRole }, UpdateRoleInput>({
      query: ({ organizationId, roleId, name, permissions }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/roles/${encodeURIComponent(roleId)}`,
        method: "PATCH",
        body: { name, permissions },
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationRoles", id: organizationId },
        { type: "OrganizationMembers", id: organizationId },
        { type: "OrganizationInvitations", id: organizationId },
      ],
    }),
    deleteRole: builder.mutation<{ ok: true }, DeleteRoleInput>({
      query: ({ organizationId, roleId }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/roles/${encodeURIComponent(roleId)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationRoles", id: organizationId },
      ],
    }),
    getMembers: builder.query<
      OrganizationMembersResponse,
      { organizationId: string; query: OrganizationMembersQuery }
    >({
      query: ({ organizationId, query }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/members`,
        params: query,
      }),
      providesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationMembers", id: organizationId },
      ],
    }),
    getInvitations: builder.query<
      OrganizationInvitation[],
      { organizationId: string }
    >({
      query: ({ organizationId }) =>
        `organizations/${encodeURIComponent(organizationId)}/invitations`,
      providesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationInvitations", id: organizationId },
      ],
    }),
    createInvitation: builder.mutation<CreateInvitationResponse, CreateInvitationInput>({
      query: ({ organizationId, email, roleId }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/invitations`,
        method: "POST",
        body: { email: email || null, roleId },
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationInvitations", id: organizationId },
        { type: "OrganizationRoles", id: organizationId },
      ],
    }),
    updateMemberRole: builder.mutation<{ membership: OrganizationMember }, UpdateMemberRoleInput>({
      query: ({ organizationId, userId, roleId }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
        method: "PATCH",
        body: { roleId },
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationMembers", id: organizationId },
        { type: "OrganizationRoles", id: organizationId },
      ],
    }),
    updateMemberStatus: builder.mutation<{ user: OrganizationMember }, UpdateMemberStatusInput>({
      query: ({ organizationId, userId, active }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}/status`,
        method: "PATCH",
        body: { active },
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationMembers", id: organizationId },
      ],
    }),
    removeMember: builder.mutation<{ ok: true }, RemoveMemberInput>({
      query: ({ organizationId, userId }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationMembers", id: organizationId },
        { type: "OrganizationRoles", id: organizationId },
      ],
    }),
  }),
  overrideExisting: false
});

export const {
  useCreateInvitationMutation,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useGetInvitationsQuery,
  useGetMembersQuery,
  useGetRolesQuery,
  useRemoveMemberMutation,
  useUpdateMemberRoleMutation,
  useUpdateMemberStatusMutation,
  useUpdateRoleMutation,
} = organizationMembersApi;
