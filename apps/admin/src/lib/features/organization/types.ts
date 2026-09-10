export type OrganizationMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export type OrganizationRole = {
  id: string | null
  name: string
  permissions: string[]
  isOwner: boolean
  legacyRole: OrganizationMemberRole | null
}

export type Organization = {
  id: string
  name: string
  slug: string
  type: 'PERSONAL' | 'SHARED'
  role: OrganizationRole
  status?: 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED'
  createdAt?: string
  updatedAt?: string
}
