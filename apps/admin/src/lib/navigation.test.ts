import { describe, expect, it } from 'vitest';
import { organizationNavigation } from './navigation';

describe('organization navigation', () => {
  it('exposes Shared Local Agents as an organization navbar item', () => {
    const agentsGroup = organizationNavigation.find((group) => group.id === 'agents');
    const agents = agentsGroup?.items.find((item) => item.routeName === 'agents');

    expect(agents).toMatchObject({
      href: '/:organizationSlug/agents',
      label: 'Agents',
      labelKey: 'agents',
    });
    expect(agents?.permissionKey).toBeUndefined();
  });

  it('exposes organization audit logs without a system-admin group', () => {
    const auditGroup = organizationNavigation.find((group) => group.id === 'audit');
    const auditLogs = auditGroup?.items.find((item) => item.routeName === 'auditLogs');

    expect(auditLogs).toMatchObject({
      href: '/:organizationSlug/audit-logs',
      permissionKey: 'manageOrganization',
    });
    expect(organizationNavigation.find((group) => group.id === 'system')).toBeUndefined();
  });
});
