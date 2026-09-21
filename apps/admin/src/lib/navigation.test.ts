import { describe, expect, it } from 'vitest';
import { hermesNavigation, organizationNavigation } from './navigation';

describe('Hermes navigation', () => {
  it('exposes Shared Local Agents outside the organization navbar', () => {
    const agents = hermesNavigation[0]?.items.find((item) => item.routeName === 'hermes.agents');

    expect(agents).toMatchObject({
      href: '/hermes/agents',
      label: 'Agents',
      labelKey: 'agents',
    });
    expect(agents?.permissionKey).toBeUndefined();
    expect(organizationNavigation.some((group) => group.id === 'agents')).toBe(false);
  });
});

describe('organization navigation', () => {
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
