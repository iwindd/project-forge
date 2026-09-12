import { describe, expect, it } from 'vitest'
import { findRouteTrail, getPath } from './routes'

describe('organization app routes', () => {
  it('uses canonical user-scoped auth routes', () => {
    expect(getPath('login')).toBe('/login')
    expect(findRouteTrail('/admin/login')).toBeNull()
  })

  it('keeps organization data routes explicitly scoped by slug', () => {
    expect(getPath('overview', { organizationSlug: 'acme' })).toBe('/acme')
    expect(getPath('auditLogs', { organizationSlug: 'acme' })).toBe(
      '/acme/audit-logs'
    )
    expect(findRouteTrail('/acme/audit-logs')?.at(-1)?.name).toBe('auditLogs')
    expect(findRouteTrail('/acme/profile')).toBeNull()
    expect(findRouteTrail('/acme/users')).toBeNull()
  })
})
