import { describe, expect, it, vi } from 'vitest';
import { ProjectStatus } from '../../domain/project.js';
import { ListProjectsUseCase } from './list-projects-use-case.js';

describe('ListProjectsUseCase', () => {
  it('lists projects for an active organization member', async () => {
    const projects = { findByOrganizationId: vi.fn(async () => [{ id: 'project-id' }]) };
    const organizations = { requireProjectAccess: vi.fn(async () => undefined) };
    const useCase = new ListProjectsUseCase(projects as never, organizations as never);

    await expect(useCase.execute('user-id', 'organization-id')).resolves.toEqual([{ id: 'project-id' }]);
    expect(organizations.requireProjectAccess).toHaveBeenCalledWith('user-id', 'organization-id');
    expect(projects.findByOrganizationId).toHaveBeenCalledWith('organization-id');
  });

  it('does not query projects when the user has no active organization membership', async () => {
    const projects = { findByOrganizationId: vi.fn() };
    const organizations = {
      requireProjectAccess: vi.fn().mockRejectedValue(
        new Error('You are not a member of this organization'),
      ),
    };
    const useCase = new ListProjectsUseCase(projects as never, organizations as never);

    await expect(
      useCase.execute('uninvited-user-id', 'organization-id'),
    ).rejects.toThrow('not a member');
    expect(projects.findByOrganizationId).not.toHaveBeenCalled();
  });

  it('lists archived projects alongside active ones for an organization member', async () => {
    const archived = {
      id: 'archived-project-id',
      organizationId: 'organization-id',
      status: ProjectStatus.ARCHIVED,
      archivedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const active = {
      id: 'active-project-id',
      organizationId: 'organization-id',
      status: ProjectStatus.ACTIVE,
      archivedAt: null,
    };
    const projects = { findByOrganizationId: vi.fn(async () => [active, archived]) };
    const organizations = { requireProjectAccess: vi.fn(async () => undefined) };
    const useCase = new ListProjectsUseCase(projects as never, organizations as never);

    await expect(useCase.execute('user-id', 'organization-id')).resolves.toEqual([active, archived]);
    expect(organizations.requireProjectAccess).toHaveBeenCalledWith('user-id', 'organization-id');
  });
});
