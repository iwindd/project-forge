import { describe, expect, it } from 'vitest';
import { getAdminCacheInvalidationTags } from '../../hooks/use-admin-cache-invalidation';
import { getAuditLogsTag } from './audit-log/audit-logs-api';
import { getSecurityLogsTag } from './security/security-api';

describe('admin API tag scoping', () => {
  it('keeps organization audit timelines isolated from personal timelines', () => {
    expect(getAuditLogsTag({ kind: 'all' }, 'org-a')).toEqual({
      type: 'AuditLogs',
      id: 'org-a',
    });
    expect(getAuditLogsTag({ kind: 'own' }, 'org-a')).toEqual({
      type: 'AuditLogs',
      id: 'own',
    });
  });

  it('builds an audit tag for the requested organization scope', () => {
    expect(
      getAdminCacheInvalidationTags({
        organizationId: 'org-a',
        auditLogs: true,
        auditLogScope: { kind: 'all' },
      }),
    ).toEqual([{ type: 'AuditLogs', id: 'org-a' }]);
  });

  it('requires organization identity for member security timelines', () => {
    expect(getSecurityLogsTag({ userId: 'user-a', organizationId: 'org-a' })).toEqual({
      type: 'SecurityLogs',
      id: 'org-a:user-a',
    });
    expect(getSecurityLogsTag({})).toEqual({ type: 'SecurityLogs', id: 'own' });
  });
});
