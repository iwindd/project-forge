import type {
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationPermission,
} from '../../domain/organization.js';

export const ORGANIZATION_MEMBER_QUERY = Symbol('ORGANIZATION_MEMBER_QUERY');

export type OrganizationMemberQueryRecord = {
  id: string;
  membershipId: string;
  name: string;
  email: string | null;
  role: {
    id: string | null;
    name: string;
    permissions: OrganizationPermission[];
    isOwner: boolean;
    legacyRole: OrganizationMemberRole | null;
  };
  status: OrganizationMemberStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export interface OrganizationMemberQuery {
  list(userId: string, organizationId: string): Promise<OrganizationMemberQueryRecord[]>;
}
