import { describe, expect, it, vi } from 'vitest';
import { ProjectStatus } from '../../domain/project.js';
import { GetProjectUseCase } from './get-project-use-case.js';

describe('GetProjectUseCase', () => {
  it('enforces organization membership scoping when reading a project', async () => {
    const projects = { findByOrganizationAndId: vi.fn(async () => null) };
    const organizations = { requireProjectAccess: vi.fn(async () => undefined) };
    const useCase = new GetProjectUseCase(projects as never, organizations as never);

    await expect(useCase.execute('user-id', 'organization-id', 'project-id')).rejects.toThrow('Project was not found');
    expect(organizations.requireProjectAccess).toHaveBeenCalledWith('user-id', 'organization-id');
    expect(projects.findByOrganizationAndId).toHaveBeenCalledWith('organization-id', 'project-id');
  });

  it('reads an archived project for an active organization member', async () => {
    const archived = {
      id: 'project-id',
      organizationId: 'organization-id',
      status: ProjectStatus.ARCHIVED,
      archivedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const projects = { findByOrganizationAndId: vi.fn(async () => archived) };
    const organizations = { requireProjectAccess: vi.fn(async () => undefined) };
    const useCase = new GetProjectUseCase(projects as never, organizations as never);

    await expect(useCase.execute('user-id', 'organization-id', 'project-id')).resolves.toBe(archived);
    expect(organizations.requireProjectAccess).toHaveBeenCalledWith('user-id', 'organization-id');
  });
});
