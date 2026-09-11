import { describe, expect, it } from 'vitest'
import { getAuditLogsTag } from './audit-log/audit-logs-api'
import { getSecurityLogsTag } from './security/security-api'
import { getUsersTag } from './user/users-api'

describe('admin API tag scoping', () => {
  it('keeps user cache entries isolated by organization', () => {
    expect(getUsersTag('org-a')).toEqual({ type: 'Users', id: 'org-a' })
    expect(getUsersTag()).toEqual({ type: 'Users', id: 'platform' })
  })

  it('keeps organization audit timelines isolated from personal timelines', () => {
    expect(getAuditLogsTag({ kind: 'all' }, 'org-a')).toEqual({
      type: 'AuditLogs',
      id: 'org-a'
    })
    expect(getAuditLogsTag({ kind: 'own' }, 'org-a')).toEqual({
      type: 'AuditLogs',
      id: 'own'
    })
  })

  it('requires organization identity for member security timelines', () => {
    expect(getSecurityLogsTag({ userId: 'user-a', organizationId: 'org-a' })).toEqual({
      type: 'SecurityLogs',
      id: 'org-a:user-a'
    })
    expect(getSecurityLogsTag({})).toEqual({ type: 'SecurityLogs', id: 'own' })
  })
})