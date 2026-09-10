import { describe, expect, it, vi } from 'vitest';
import { ProjectStatus } from '../../domain/project.js';
import { UpdateProjectUseCase } from './update-project-use-case.js';

describe('UpdateProjectUseCase', () => {
  it('updates project fields and writes an audit record', async () => {
    const project = {
      id: 'project-id',
      organizationId: 'organization-id',
      name: 'Old name',
      githubUrl: 'https://github.com/acme/demo',
      githubOwner: 'acme',
      githubRepo: 'demo',
      sourceBranch: 'main',
      targetBranch: 'main',
      nodeVersion: null,
      environmentMetadata: null,
      status: ProjectStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    };
    const projects = {
      findByOrganizationAndId: vi.fn(async () => project),
      save: vi.fn(async () => undefined),
    };
    const audit = { record: vi.fn(async () => undefined) };
    const organizations = { requireProjectManager: vi.fn(async () => undefined) };
    const unitOfWork = { run: vi.fn(async <T>(work: () => Promise<T>) => work()) };
    const useCase = new UpdateProjectUseCase(projects as never, organizations as never, audit as never, unitOfWork as never);

    const result = await useCase.execute('actor-id', 'organization-id', 'project-id', { name: 'New name' });

    expect(result.name).toBe('New name');
    expect(projects.save).toHaveBeenCalledOnce();
    expect(organizations.requireProjectManager).toHaveBeenCalledWith(
      'actor-id',
      'organization-id',
    );
    expect(audit.record).toHaveBeenCalledOnce();
  });
});
