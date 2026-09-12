import { describe, expect, it } from 'vitest'
import {
  parseAcceptInvitationResponse,
  parseCancelInvitationResponse,
  parseCreateInvitationResponse,
  parseOkResponse,
  parseMemberRoleResponse,
  parseMemberUserResponse,
  parseMembersResponse,
  parseRoleMutationResponse,
  parseRoleResponse
} from './organization-members-api'

describe('organization member transport contracts', () => {
  it('maps role collection data and metadata from the API envelope', () => {
    expect(
      parseRoleResponse(
        [
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            name: 'แอดมิน',
            permissions: ['organization.manage'],
            isOwner: false,
            code: 'ADMIN',
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
            id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'แอดมิน',
          permissions: ['organization.manage'],
          isOwner: false,
          code: 'ADMIN',
          memberCount: 2,
          invitationCount: 1
        }
      ],
      availablePermissions: [{ key: 'organization.manage' }]
    })
  })

  it('maps member collection data and pagination metadata from the API envelope', () => {
    const member = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      membershipId: '550e8400-e29b-41d4-a716-446655440003',
      name: 'User',
      email: 'user@example.com',
      role: {
          id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'สมาชิก',
        permissions: [],
        isOwner: false,
        code: 'MEMBER' as const
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
      id: '550e8400-e29b-41d4-a716-446655440000',
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
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'User',
      email: 'user@example.com',
      role: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'สมาชิก',
        permissions: [],
        isOwner: false,
        code: 'MEMBER' as const
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

  it('parses role, invitation, and delete mutation payloads at runtime', () => {
    const role = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'แอดมิน',
      permissions: ['organization.manage'],
      isOwner: false,
      code: 'ADMIN' as const
    }
    const invitation = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      email: 'invite@example.com',
      role,
      status: 'PENDING' as const,
      expiresAt: '2026-01-08T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z'
    }

    expect(parseRoleMutationResponse({ role })).toEqual({ role })
    expect(
      parseCreateInvitationResponse({ invitation, token: 'invite-token' })
    ).toEqual({ invitation, token: 'invite-token' })
    expect(parseOkResponse({ ok: true })).toEqual({ ok: true })
    expect(() => parseOkResponse({ ok: 'yes' })).toThrow()
    expect(parseCancelInvitationResponse(null)).toBeNull()
    expect(() => parseCancelInvitationResponse({ ok: true })).toThrow()
  })
})
