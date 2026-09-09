export type AdminUser = {
  id: string
  name?: string | null
  email?: string | null
  role: 'ADMIN' | 'EDITOR'
  activeOrganizationId?: string | null
  organizationRole?: {
    id: string | null
    name: string
    permissions: string[]
    isOwner: boolean
    legacyRole: 'OWNER' | 'ADMIN' | 'MEMBER' | null
  } | null
  organizationPermissions?: string[]
}
