import { describe, expect, it } from 'vitest'
import { adminNavigation } from './navigation'

describe('organization navigation', () => {
  it('exposes organization audit logs under the system group', () => {
    const systemGroup = adminNavigation.find(group => group.id === 'system')
    const auditLogs = systemGroup?.items.find(
      item => item.routeName === 'system.auditLogs'
    )

    expect(auditLogs).toMatchObject({
      href: '/:organizationSlug/audit-logs',
      permissionKey: 'manageOrganization'
    })
  })
})
