import { describe, expect, it } from 'vitest'
import { organizationListSchema } from '@/lib/features/organization/organization-schemas'

describe('organization list response contract', () => {
  it('accepts the organization context returned by the API', () => {
    const result = organizationListSchema.parse([
      {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Personal Workspace',
        slug: 'personal-workspace',
        type: 'PERSONAL',
        role: {
          id: null,
          name: 'เจ้าของ',
          permissions: ['organization.manage'],
          isOwner: true,
          legacyRole: 'OWNER'
        },
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ])

    expect(result[0]?.role.name).toBe('เจ้าของ')
  })
})
