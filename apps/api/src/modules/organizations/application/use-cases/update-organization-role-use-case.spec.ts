import { describe, expect, it, vi } from 'vitest';
import { UpdateOrganizationRoleUseCase } from './update-organization-role-use-case.js';

describe('UpdateOrganizationRoleUseCase', () => {
  it('delegates role updates to the organization application service', async () => {
    const role = { id: 'role-id', name: 'Managers' };
    const organizations = { updateRole: vi.fn().mockResolvedValue(role) };
    const useCase = new UpdateOrganizationRoleUseCase(organizations as never);
    const input = { name: 'Managers', permissions: ['organization.manage' as const] };

    await expect(useCase.execute('actor-id', 'organization-id', 'role-id', input, { requestId: 'request-id' })).resolves.toBe(role);
    expect(organizations.updateRole).toHaveBeenCalledWith(
      'actor-id',
      'organization-id',
      'role-id',
      input,
      { requestId: 'request-id' },
    );
  });
});
