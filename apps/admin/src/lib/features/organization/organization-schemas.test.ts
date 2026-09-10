import { describe, expect, it } from 'vitest'
import {
  organizationRoleSummarySchema,
  organizationSchema
} from './organization-schemas'

const organizationId = '00000000-0000-0000-0000-000000000000'

const organization = {
  id: organizationId,
  name: 'Organization A',
  slug: 'organization-a',
  type: 'SHARED' as const,
  role: {
    id: null,
    name: 'เจ้าของ',
    permissions: ['organization.manage'],
    isOwner: true,
    legacyRole: 'OWNER' as const
  },
  status: 'ACTIVE' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

describe('organization response schemas', () => {
  it('accepts canonical database UUIDs without RFC version bits', () => {
    expect(organizationSchema.parse(organization)).toEqual(organization)
  })

  it('rejects non-database UUID identifiers', () => {
    expect(() =>
      organizationSchema.parse({ ...organization, id: 'organization-id' })
    ).toThrow()
  })

  it('requires role member and invitation counts', () => {
    expect(() =>
      organizationRoleSummarySchema.parse({
        id: organizationId,
        name: 'สมาชิก',
        permissions: [],
        isOwner: false,
        legacyRole: 'MEMBER'
      })
    ).toThrow()
  })
})
