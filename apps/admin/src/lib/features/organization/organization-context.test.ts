import { describe, expect, it } from 'vitest';
import { addOrganizationHeader, resolveOrganizationFromRoute } from './organization-context';

const organizations = [
  {
    id: 'organization-a',
    name: 'Organization A',
    slug: 'organization-a',
    type: 'SHARED' as const,
    role: {
      id: 'role-a',
      name: 'แอดมิน',
      permissions: ['organization.manage'],
      isOwner: false,
      code: 'ADMIN' as const,
    },
  },
  {
    id: 'organization-b',
    name: 'Organization B',
    slug: 'organization-b',
    type: 'SHARED' as const,
    role: {
      id: 'role-b',
      name: 'สมาชิก',
      permissions: [],
      isOwner: false,
      code: 'MEMBER' as const,
    },
  },
];

describe('organization request context', () => {
  it('adds only an explicitly supplied organization id', () => {
    const headers = addOrganizationHeader(new Headers(), 'organization-id');
    expect(headers.get('X-Organization-Id')).toBe('organization-id');
  });

  it('does not invent an organization id', () => {
    const headers = addOrganizationHeader(new Headers());
    expect(headers.has('X-Organization-Id')).toBe(false);
  });

  it('resolves the request scope from the route slug and explicit id', () => {
    expect(resolveOrganizationFromRoute(organizations, 'organization-a', 'organization-a')).toEqual(organizations[0]);
    expect(resolveOrganizationFromRoute(organizations, 'organization-a', 'organization-b')).toBeUndefined();
  });
});
