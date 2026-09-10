import { describe, expect, it } from 'vitest'
import {
  parseAcceptInvitationResponse,
  parseMemberRoleResponse,
  parseMemberUserResponse,
  parseMembersResponse,
  parseRoleResponse
} from './organization-members-api'

describe('organization member transport contracts', () => {
  it('maps role collection data and metadata from the API envelope', () => {
    expect(
      parseRoleResponse(
        [
          {
            id: 'role-id',
            name: 'แอดมิน',
            permissions: ['organization.manage'],
            isOwner: false,
            legacyRole: 'ADMIN',
            memberCount: 2,
            invitationCount: 1
          }
        ],
        {
          apiMeta: {
            availablePermissions: [{ key: 'organization.manage' }]
          }
        }
      )
    ).toEqual({
      data: [
        {
          id: 'role-id',
          name: 'แอดมิน',
          permissions: ['organization.manage'],
          isOwner: false,
          legacyRole: 'ADMIN',
          memberCount: 2,
          invitationCount: 1
        }
      ],
      availablePermissions: [{ key: 'organization.manage' }]
    })
  })

  it('maps member collection data and pagination metadata from the API envelope', () => {
    const member = {
      id: 'user-id',
      membershipId: 'membership-id',
      name: 'User',
      email: 'user@example.com',
      role: {
        id: 'role-id',
        name: 'สมาชิก',
        permissions: [],
        isOwner: false,
        legacyRole: 'MEMBER' as const
      },
      status: 'ACTIVE' as const,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z'
    }

    expect(
      parseMembersResponse([member], {
        apiMeta: { page: 1, pageSize: 10, total: 1, totalPages: 1 }
      })
    ).toEqual({
      data: [member],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1
    })
  })

  it('parses the accepted organization payload after the API envelope is unwrapped', () => {
    const organization = {
      id: 'organization-id',
      name: 'Organization A',
      slug: 'organization-a',
      type: 'SHARED' as const,
      status: 'ACTIVE' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z'
    }

    expect(parseAcceptInvitationResponse({ organization })).toEqual({
      organization
    })
  })

  it('parses member mutation payloads with their endpoint-specific keys', () => {
    const member = {
      id: 'user-id',
      name: 'User',
      email: 'user@example.com',
      role: {
        id: 'role-id',
        name: 'สมาชิก',
        permissions: [],
        isOwner: false,
        legacyRole: 'MEMBER' as const
      },
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z'
    }

    expect(parseMemberUserResponse({ user: member })).toEqual({ user: member })
    expect(parseMemberRoleResponse({ membership: member })).toEqual({
      membership: member
    })
  })
})
