import { describe, expect, it, vi } from 'vitest';
import { DeleteOrganizationRoleUseCase } from './delete-organization-role-use-case.js';

describe('DeleteOrganizationRoleUseCase', () => {
  it('delegates role deletion to the organization application service', async () => {
    const organizations = { deleteRole: vi.fn().mockResolvedValue({ ok: true }) };
    const useCase = new DeleteOrganizationRoleUseCase(organizations as never);

    await expect(useCase.execute('actor-id', 'organization-id', 'role-id')).resolves.toEqual({ ok: true });
    expect(organizations.deleteRole).toHaveBeenCalledWith('actor-id', 'organization-id', 'role-id');
  });
});
