import { describe, expect, it } from 'vitest'
import { scopeUserToOrganization, type AdminUser } from './session'

describe('scopeUserToOrganization', () => {
  it('derives organization permissions from the route organization', () => {
    const user: AdminUser = { id: 'user-id', role: 'EDITOR' }
    const organization = {
      id: 'organization-a',
      name: 'Organization A',
      slug: 'organization-a',
      type: 'SHARED' as const,
      role: {
        id: 'role-id',
        name: 'แอดมิน',
        permissions: ['organization.manage'],
        isOwner: false,
        legacyRole: 'ADMIN' as const
      }
    }

    expect(scopeUserToOrganization(user, organization)).toMatchObject({
      organizationRole: organization.role,
      organizationPermissions: ['organization.manage']
    })
  })
})
