import { describe, expect, it, vi } from 'vitest';
import { CreateOrganizationRoleUseCase } from './create-organization-role-use-case.js';

describe('CreateOrganizationRoleUseCase', () => {
  it('delegates role creation with the normalized request boundary intact', async () => {
    const role = { id: 'role-id' };
    const organizations = { createRole: vi.fn().mockResolvedValue(role) };
    const useCase = new CreateOrganizationRoleUseCase(organizations as never);
    const input = { name: 'Reviewer', permissions: ['organization.manage' as const] };

    await expect(useCase.execute('actor-id', 'organization-id', input)).resolves.toBe(role);
    expect(organizations.createRole).toHaveBeenCalledWith(
      'actor-id',
      'organization-id',
      'Reviewer',
      ['organization.manage'],
    );
  });
});
