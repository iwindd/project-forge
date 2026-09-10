import { describe, expect, it } from 'vitest'
import {
  getDefaultInvitationRoleId,
  getInvitationRoleOptions
} from './invitation-role-options'

describe('invitation role options', () => {
  it('keeps only persisted Admin and Member roles with ids', () => {
    const roles = [
      { id: 'owner', legacyRole: 'OWNER' as const },
      { id: null, legacyRole: 'ADMIN' as const },
      { id: 'custom', legacyRole: null },
      { id: 'admin', legacyRole: 'ADMIN' as const },
      { id: 'member', legacyRole: 'MEMBER' as const }
    ]

    expect(getInvitationRoleOptions(roles)).toEqual([
      { id: 'admin', legacyRole: 'ADMIN' },
      { id: 'member', legacyRole: 'MEMBER' }
    ])
  })

  it('prefers the built-in Member role as the default', () => {
    expect(
      getDefaultInvitationRoleId([
        { id: 'admin', legacyRole: 'ADMIN' },
        { id: 'member', legacyRole: 'MEMBER' }
      ])
    ).toBe('member')
  })
})
