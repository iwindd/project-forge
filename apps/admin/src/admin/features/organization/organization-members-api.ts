import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { addOrganizationHeader } from "./organization-context";

export type OrganizationMemberRole = "OWNER" | "ADMIN" | "MEMBER";
export type OrganizationMemberStatus =
  | "ACTIVE"
  | "INVITED"
  | "SUSPENDED"
  | "REMOVED";

export type OrganizationMember = {
  id: string;
  membershipId: string;
  name: string;
  email: string | null;
  role: OrganizationMemberRole;
  status: OrganizationMemberStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationInvitation = {
  id: string;
  organizationId: string;
  email: string | null;
  role: Exclude<OrganizationMemberRole, "OWNER">;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
  createdAt: string;
};

export type OrganizationMembersQuery = {
  search?: string;
  role?: "OWNER" | "ADMIN" | "MEMBER";
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

type OrganizationInvitationsResponse = {
  data: OrganizationInvitation[];
};

type CreateInvitationResponse = {
  invitation: OrganizationInvitation;
  token: string;
};

type CreateInvitationInput = {
  organizationId: string;
  email?: string | null;
  role: Exclude<OrganizationMemberRole, "OWNER">;
};

type UpdateMemberRoleInput = {
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
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

const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5050";

export const organizationMembersApi = createApi({
  reducerPath: "organizationMembersApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${apiOrigin}/api/v1/`,
    credentials: "include",
    cache: "no-store",
    prepareHeaders: (headers) => addOrganizationHeader(headers),
  }),
  tagTypes: ["OrganizationMembers", "OrganizationInvitations"],
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
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
      OrganizationInvitationsResponse,
      { organizationId: string }
    >({
      query: ({ organizationId }) =>
        `organizations/${encodeURIComponent(organizationId)}/invitations`,
      providesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationInvitations", id: organizationId },
      ],
    }),
    createInvitation: builder.mutation<
      CreateInvitationResponse,
      CreateInvitationInput
    >({
      query: ({ organizationId, email, role }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/invitations`,
        method: "POST",
        body: { email: email || null, role },
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationInvitations", id: organizationId },
      ],
    }),
    updateMemberRole: builder.mutation<
      { membership: OrganizationMember },
      UpdateMemberRoleInput
    >({
      query: ({ organizationId, userId, role }) => ({
        url: `organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
        method: "PATCH",
        body: { role },
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationMembers", id: organizationId },
      ],
    }),
    updateMemberStatus: builder.mutation<
      { user: OrganizationMember },
      UpdateMemberStatusInput
    >({
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
      ],
    }),
  }),
});

export const {
  useCreateInvitationMutation,
  useGetInvitationsQuery,
  useGetMembersQuery,
  useRemoveMemberMutation,
  useUpdateMemberRoleMutation,
  useUpdateMemberStatusMutation,
} = organizationMembersApi;
