import { describe, expect, it } from 'vitest'
import {
  parseCreateOrganizationResponse,
  parseUpdateOrganizationResponse
} from './organization-api'

const organization = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Organization A',
  slug: 'organization-a',
  type: 'SHARED' as const,
  status: 'ACTIVE' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

describe('organization transport contracts', () => {
  it('parses the create organization response at runtime', () => {
    expect(
      parseCreateOrganizationResponse({
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          type: organization.type
        }
      })
    ).toEqual({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        type: organization.type
      }
    })
  })

  it('parses the full organization mutation response', () => {
    expect(parseUpdateOrganizationResponse({ organization })).toEqual({
      organization
    })
  })

  it('rejects malformed organization mutation output', () => {
    expect(() =>
      parseCreateOrganizationResponse({
        organization: { ...organization, id: 'organization-id' }
      })
    ).toThrow()
  })
})
