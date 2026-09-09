import { describe, expect, it } from 'vitest'
import { organizationListSchema } from './organization-response.schemas.js'

describe('organizationListSchema', () => {
  it('accepts canonical PostgreSQL UUIDs without RFC version bits', () => {
    const organizationId = '00000000-0000-0000-0000-000000000000'

    const result = organizationListSchema.parse([
      {
        id: organizationId,
        name: 'Personal Workspace',
        slug: 'personal-workspace',
        type: 'PERSONAL',
        role: {
          id: null,
          name: 'Owner',
          permissions: ['organization.manage'],
          isOwner: true,
          legacyRole: 'OWNER',
        },
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])

    expect(result[0]?.id).toBe(organizationId)
  })
})
