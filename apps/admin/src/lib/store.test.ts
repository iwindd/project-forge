import { describe, expect, it } from 'vitest';
import { createPreloadedState } from './store';

describe('store preload boundary', () => {
  it('hydrates the organization query through the existing Redux preload state', async () => {
    const organizations = [
      {
        id: 'organization-id',
        name: 'Organization',
        slug: 'organization',
        type: 'SHARED' as const,
        role: {
          id: 'role-id',
          name: 'แอดมิน',
          permissions: ['organization.manage'],
          isOwner: false,
          code: 'ADMIN' as const,
        },
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const state = await createPreloadedState({ user: { id: 'user-id', role: 'EDITOR' } }, organizations);

    expect(state.api?.queries['getOrganizations(undefined)']).toMatchObject({
      status: 'fulfilled',
      data: organizations,
    });
  });
});
