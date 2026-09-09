import { describe, expect, it, vi } from 'vitest';
import { ListOrganizationRolesUseCase } from './list-organization-roles-use-case.js';

describe('ListOrganizationRolesUseCase', () => {
  it('lists roles for the requested organization', async () => {
    const organizations = { listRoles: vi.fn().mockResolvedValue([]) };
    const useCase = new ListOrganizationRolesUseCase(organizations as never);

    await expect(useCase.execute('actor-id', 'organization-id')).resolves.toEqual([]);
    expect(organizations.listRoles).toHaveBeenCalledWith('actor-id', 'organization-id');
  });
});
