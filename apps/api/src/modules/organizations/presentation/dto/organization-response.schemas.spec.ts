import { describe, expect, it } from 'vitest'
import {
  organizationInvitationResponseSchema,
  organizationListSchema,
  organizationMemberRoleResponseSchema,
  organizationMemberUserResponseSchema,
  organizationRoleResponseSchema,
  okResponseSchema,
} from './organization-response.schemas.js'

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
          name: 'เจ้าของ',
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

  it('requires canonical UUIDs and complete mutation response fields', () => {
    expect(() =>
      organizationRoleResponseSchema.parse({
        role: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'แอดมิน',
          permissions: [],
          isOwner: false,
          legacyRole: 'ADMIN',
        },
      }),
    ).not.toThrow()
  })

  it('validates member, invitation, and acknowledgement mutation payloads', () => {
    const role = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'สมาชิก',
      permissions: [],
      isOwner: false,
      legacyRole: 'MEMBER' as const,
    }
    const user = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'User',
      email: 'user@example.com',
      role,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    expect(organizationMemberUserResponseSchema.parse({ user })).toEqual({ user })
    expect(organizationMemberRoleResponseSchema.parse({ membership: user })).toEqual({
      membership: user,
    })
    expect(
      organizationInvitationResponseSchema.parse({
        invitation: {
          id: '550e8400-e29b-41d4-a716-446655440002',
          organizationId: '550e8400-e29b-41d4-a716-446655440003',
          email: 'invite@example.com',
          role,
          status: 'PENDING',
          expiresAt: '2026-01-08T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        token: 'invite-token',
      }),
    ).toBeTruthy()
    expect(okResponseSchema.parse({ ok: true })).toEqual({ ok: true })
  })
})
