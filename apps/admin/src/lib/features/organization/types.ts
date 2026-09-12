export type OrganizationMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export type OrganizationRole = {
  id: string
  name: string
  permissions: string[]
  isOwner: boolean
  code: OrganizationMemberRole | null
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
