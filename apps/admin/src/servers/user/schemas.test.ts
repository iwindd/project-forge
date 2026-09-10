import { describe, expect, it } from 'vitest'
import { normalizeUserRole, userRoleSchema } from './schemas'

describe('user response role contract', () => {
  it('normalizes string and organization role payloads consistently', () => {
    expect(normalizeUserRole(userRoleSchema.parse('OWNER'))).toBe('ADMIN')
    expect(
      normalizeUserRole(
        userRoleSchema.parse({ legacyRole: 'ADMIN', isOwner: false })
      )
    ).toBe('ADMIN')
    expect(
      normalizeUserRole(
        userRoleSchema.parse({ legacyRole: 'MEMBER', isOwner: false })
      )
    ).toBe('EDITOR')
  })

  it('rejects role objects without the fields used for authorization display', () => {
    expect(() => userRoleSchema.parse({ legacyRole: 'MEMBER' })).toThrow()
  })
})
