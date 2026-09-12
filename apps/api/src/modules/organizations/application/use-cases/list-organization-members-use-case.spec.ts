import { describe, expect, it, vi } from 'vitest';
import { ListOrganizationMembersUseCase } from './list-organization-members-use-case.js';

const members = [
  {
    id: 'user-a',
    membershipId: 'membership-a',
    name: 'Alice',
    email: 'alice@example.com',
    role: { id: 'role-member', name: 'สมาชิก', permissions: [], isOwner: false, code: 'MEMBER' as const },
    status: 'ACTIVE',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-b',
    membershipId: 'membership-b',
    name: 'Bob',
    email: 'bob@example.com',
    role: { id: 'role-admin', name: 'แอดมิน', permissions: ['organization.manage'], isOwner: false, code: 'ADMIN' as const },
    status: 'ACTIVE',
    isActive: true,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'user-c',
    membershipId: 'membership-c',
    name: 'Carol',
    email: 'carol@example.com',
    role: { id: 'role-member', name: 'สมาชิก', permissions: [], isOwner: false, code: 'MEMBER' as const },
    status: 'SUSPENDED',
    isActive: false,
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
  },
] as never;

describe('ListOrganizationMembersUseCase', () => {
  it('filters, sorts, and paginates organization members', async () => {
    const memberQuery = { list: vi.fn().mockResolvedValue(members) };
    const useCase = new ListOrganizationMembersUseCase(memberQuery as never);

    await expect(
      useCase.execute('user-id', 'organization-id', {
        roleId: 'role-member',
        status: 'active',
        page: 1,
        pageSize: 1,
        sortBy: 'name',
        sortDirection: 'desc',
      }),
    ).resolves.toMatchObject({
      data: [{ id: 'user-a' }],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
  });

  it('filters by the persisted role id', async () => {
    const memberQuery = { list: vi.fn().mockResolvedValue(members) };
    const useCase = new ListOrganizationMembersUseCase(memberQuery as never);

    await expect(
      useCase.execute('user-id', 'organization-id', {
        roleId: 'role-member',
        page: 1,
        pageSize: 10,
        sortBy: 'name',
        sortDirection: 'asc',
      }),
    ).resolves.toMatchObject({
      data: [{ id: 'user-a' }, { id: 'user-c' }],
      total: 2,
    });
  });
});
