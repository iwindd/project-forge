import type { Organization } from './lib/features/organization/types'

export type AdminUser = {
  id: string
  name?: string | null
  email?: string | null
  role: 'ADMIN' | 'EDITOR'
  createdAt?: string
  updatedAt?: string
  organizationRole?: {
    id: string | null
    name: string
    permissions: string[]
    isOwner: boolean
    code: 'OWNER' | 'ADMIN' | 'MEMBER' | null
  } | null
  organizationPermissions?: string[]
}

export type AdminSession = {
  user: AdminUser
}

export function scopeUserToOrganization(
  user: AdminUser,
  organization: Organization
): AdminUser {
  return {
    ...user,
    organizationRole: organization.role,
    organizationPermissions: organization.role.permissions
  }
}
