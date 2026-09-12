import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/api';
import { getAdminCacheInvalidationTags } from '../../hooks/use-admin-cache-invalidation';
import { getAuditLogsTag } from './audit-log/audit-logs-api';
import { getSecurityLogsTag } from './security/security-api';
import { getUsersTag, usersApi } from './user/users-api';

describe('admin API tag scoping', () => {
  it('keeps user cache entries isolated by organization', () => {
    expect(getUsersTag('org-a')).toEqual({ type: 'Users', id: 'org-a' });
    expect(getUsersTag()).toEqual({ type: 'Users', id: 'platform' });
  });

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

  it('builds exact scoped tags for admin cache invalidation', () => {
    expect(
      getAdminCacheInvalidationTags({
        resources: ['users'],
        organizationId: 'org-a',
        auditLogs: true,
        auditLogScope: { kind: 'all' },
      }),
    ).toEqual([
      { type: 'Users', id: 'org-a' },
      { type: 'AuditLogs', id: 'org-a' },
    ]);
    expect(
      getAdminCacheInvalidationTags({
        resources: ['users'],
        auditLogs: false,
      }),
    ).toEqual([{ type: 'Users', id: 'platform' }]);
  });

  it('requires organization identity for member security timelines', () => {
    expect(getSecurityLogsTag({ userId: 'user-a', organizationId: 'org-a' })).toEqual({
      type: 'SecurityLogs',
      id: 'org-a:user-a',
    });
    expect(getSecurityLogsTag({})).toEqual({ type: 'SecurityLogs', id: 'own' });
  });

  it('invalidates only the active cache entry for the matching scope', async () => {
    const requestUrl = (input: RequestInfo | URL) => (input instanceof Request ? input.url : String(input));
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      const organizationId = url.match(/organizations\/([^/]+)\/members/)?.[1];
      const id = organizationId ? `user-${organizationId}` : 'platform-user';

      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              {
                id,
                name: id,
                email: `${id}@example.com`,
                role: 'EDITOR',
                isActive: true,
                createdAt: '2026-01-01T00:00:00.000Z',
              },
            ],
            meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
    });
    const query = {
      page: 1,
      pageSize: 10,
      search: '',
      status: 'all' as const,
      sortBy: 'name' as const,
      sortDirection: 'asc' as const,
    };

    const organizationResult = await store.dispatch(
      usersApi.endpoints.getUsers.initiate({ organizationId: 'org-a', query }),
    );
    const changedOrganizationResult = await store.dispatch(
      usersApi.endpoints.getUsers.initiate({ organizationId: 'org-b', query }),
    );
    const personalResult = await store.dispatch(usersApi.endpoints.getUsers.initiate({ query }));

    expect(organizationResult.data?.data[0]?.id).toBe('user-org-a');
    expect(changedOrganizationResult.data?.data[0]?.id).toBe('user-org-b');
    expect(personalResult.data?.data[0]?.id).toBe('platform-user');
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const organizationTags = getAdminCacheInvalidationTags({
      resources: ['users'],
      organizationId: 'org-a',
      auditLogs: false,
    });
    const personalTags = getAdminCacheInvalidationTags({
      resources: ['users'],
      auditLogs: false,
    });

    expect(organizationTags).toEqual([{ type: 'Users', id: 'org-a' }]);
    expect(personalTags).toEqual([{ type: 'Users', id: 'platform' }]);

    store.dispatch(api.util.invalidateTags(organizationTags));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(requestUrl(fetchMock.mock.calls[3][0])).toContain('/organizations/org-a/members');

    store.dispatch(api.util.invalidateTags(personalTags));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    expect(requestUrl(fetchMock.mock.calls[4][0])).toContain('/admin/users');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});
