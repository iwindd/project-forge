import { describe, expect, it } from 'vitest'
import { authMeDataSchema } from './auth.schemas.js'

describe('authMeDataSchema', () => {
  it('accepts canonical PostgreSQL UUIDs without RFC version bits', () => {
    const organizationId = '00000000-0000-0000-0000-000000000000'
    const roleId = '11111111-1111-1111-1111-111111111111'

    const result = authMeDataSchema.parse({
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        githubUserId: 'github-user',
        githubLogin: 'github-login',
        name: null,
        avatarUrl: null,
        role: 'ADMIN',
        accessStatus: 'APPROVED',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      profile: null,
      organizations: [
        {
          id: organizationId,
          name: 'Personal Workspace',
          slug: 'personal-workspace',
          type: 'PERSONAL',
          role: {
            id: roleId,
            name: 'Owner',
            permissions: ['organization.manage'],
            isOwner: true,
            legacyRole: 'OWNER',
          },
        },
      ],
    })

    expect(result.organizations[0]?.id).toBe(organizationId)
    expect(result.organizations[0]?.role.id).toBe(roleId)
  })
})
