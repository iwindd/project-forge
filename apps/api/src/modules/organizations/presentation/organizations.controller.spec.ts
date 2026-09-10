import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { OrganizationsController } from './organizations.controller.js';

const organizationId = '550e8400-e29b-41d4-a716-446655440000';
const userId = '550e8400-e29b-41d4-a716-446655440001';

const principal = {
  id: userId,
} as AuthenticatedPrincipal;

function createController() {
  return new OrganizationsController(
    {
      listForUser: vi.fn(),
      listMembers: vi.fn(),
    } as never,
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
  );
}

describe('OrganizationsController', () => {
  it('does not expose organization member profile mutation', () => {
    expect(
      Object.prototype.hasOwnProperty.call(
        OrganizationsController.prototype,
        'memberName',
      ),
    ).toBe(false);
  });

  it('returns the authenticated organization list in the standard envelope', async () => {
    const controller = createController();
    const listForUser = vi.mocked(
      (controller as unknown as { organizations: { listForUser: ReturnType<typeof vi.fn> } })
        .organizations.listForUser,
    );
    listForUser.mockResolvedValue([
      {
        organization: {
          id: organizationId,
          name: 'Organization',
          slug: 'organization',
          type: 'SHARED',
          status: 'ACTIVE',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
        role: {
          id: organizationId,
          name: 'แอดมิน',
          permissions: ['organization.manage'],
          isOwner: false,
          legacyRole: 'ADMIN',
        },
      },
    ]);

    await expect(controller.list(principal)).resolves.toEqual({
      data: [
        {
          id: organizationId,
          name: 'Organization',
          slug: 'organization',
          type: 'SHARED',
          role: {
            id: organizationId,
            name: 'แอดมิน',
            permissions: ['organization.manage'],
            isOwner: false,
            legacyRole: 'ADMIN',
          },
          status: 'ACTIVE',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    });
  });

  it('returns roles and available permissions in the standard envelope', async () => {
    const controller = createController();
    const roles = [
      {
        id: organizationId,
        name: 'แอดมิน',
        permissions: ['organization.manage'],
        isOwner: false,
        legacyRole: 'ADMIN',
        memberCount: 1,
        invitationCount: 0,
      },
    ];
    const execute = vi.mocked(
      (controller as unknown as { listOrganizationRoles: { execute: ReturnType<typeof vi.fn> } })
        .listOrganizationRoles.execute,
    );
    execute.mockResolvedValue(roles);

    await expect(
      controller.roles(principal, { id: organizationId }),
    ).resolves.toEqual({
      data: roles,
      meta: {
        availablePermissions: [{ key: 'organization.manage' }],
      },
    });
  });

  it('returns members in data with pagination metadata', async () => {
    const controller = createController();
    const members = [
      {
        id: userId,
        membershipId: organizationId,
        name: 'User',
        email: 'user@example.com',
        role: {
          id: organizationId,
          name: 'สมาชิก',
          permissions: [],
          isOwner: false,
          legacyRole: 'MEMBER',
        },
        status: 'ACTIVE',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ];
    const listMembers = vi.mocked(
      (controller as unknown as { organizations: { listMembers: ReturnType<typeof vi.fn> } })
        .organizations.listMembers,
    );
    listMembers.mockResolvedValue(members);

    await expect(
      controller.members(
        principal,
        { id: organizationId },
        { page: '1', pageSize: '10', sortBy: 'createdAt', sortDirection: 'desc' },
      ),
    ).resolves.toEqual({
      data: members,
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
  });

  it('rejects an invalid organization route parameter at the boundary', async () => {
    const controller = createController();

    await expect(
      controller.roles(principal, { id: 'not-an-organization-id' }),
    ).rejects.toThrow();
  });

  it('rejects a role mutation result that violates the response contract', async () => {
    const controller = createController();
    const execute = vi.mocked(
      (controller as unknown as { createOrganizationRole: { execute: ReturnType<typeof vi.fn> } })
        .createOrganizationRole.execute,
    );
    execute.mockResolvedValue({ id: 'not-an-id' });

    await expect(
      controller.createRole(principal, { id: organizationId }, {
        name: 'แอดมิน',
        permissions: ['organization.manage'],
      }),
    ).rejects.toThrow();
  });
});
