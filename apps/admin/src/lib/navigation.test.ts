import { describe, expect, it } from 'vitest'
import { organizationNavigation } from './navigation'

describe('organization navigation', () => {
  it('exposes organization audit logs without a system-admin group', () => {
    const auditGroup = organizationNavigation.find(group => group.id === 'audit')
    const auditLogs = auditGroup?.items.find(
      item => item.routeName === 'auditLogs'
    )

    expect(auditLogs).toMatchObject({
      href: '/:organizationSlug/audit-logs',
      permissionKey: 'manageOrganization'
    })
    expect(organizationNavigation.find(group => group.id === 'system')).toBeUndefined()
  })
})
