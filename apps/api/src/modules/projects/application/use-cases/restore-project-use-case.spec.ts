import { describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../../../common/errors/application-error.js';
import { ProjectStatus } from '../../domain/project.js';
import { RestoreProjectUseCase } from './restore-project-use-case.js';

type ProjectFixture = {
  id: string;
  organizationId: string;
  status: ProjectStatus;
  archivedAt: Date | null;
  updatedAt: Date;
};

function archivedProject(): ProjectFixture {
  return {
    id: 'project-id',
    organizationId: 'organization-id',
    status: ProjectStatus.ARCHIVED,
    archivedAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function setup(project: ProjectFixture | null) {
  const projects = {
    findByOrganizationAndId: vi.fn(async () => project),
    save: vi.fn(async () => undefined),
  };
  const audit = { record: vi.fn(async () => undefined) };
  const organizations = { requireProjectManager: vi.fn(async () => undefined) };
  const unitOfWork = { run: vi.fn(async <T>(work: () => Promise<T>) => work()) };
  const useCase = new RestoreProjectUseCase(
    projects as never,
    organizations as never,
    audit as never,
    unitOfWork as never,
  );
  return { useCase, projects, audit, organizations };
}

describe('RestoreProjectUseCase', () => {
  it('restores an archived project and writes one audit record', async () => {
    const { useCase, projects, audit, organizations } = setup(archivedProject());

    const result = await useCase.execute('actor-id', 'organization-id', 'project-id');

    expect(result.status).toBe(ProjectStatus.ACTIVE);
    expect(result.archivedAt).toBeNull();
    expect(projects.save).toHaveBeenCalledOnce();
    expect(organizations.requireProjectManager).toHaveBeenCalledWith(
      'actor-id',
      'organization-id',
    );
    expect(audit.record).toHaveBeenCalledOnce();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'actor-id',
        organizationId: 'organization-id',
        action: 'PROJECT_RESTORED',
        resourceType: 'PROJECT',
        resourceId: 'project-id',
        before: { status: ProjectStatus.ARCHIVED },
        after: { status: ProjectStatus.ACTIVE },
      }),
    );
  });

  it('records the optional reason and request ID when supplied', async () => {
    const { useCase, audit } = setup(archivedProject());

    await useCase.execute('actor-id', 'organization-id', 'project-id', {
      reason: 'restored by mistake',
      requestId: 'request-id',
    });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'restored by mistake', requestId: 'request-id' }),
    );
  });

  it('is a safe no-op when the project is already active', async () => {
    const project = { ...archivedProject(), status: ProjectStatus.ACTIVE, archivedAt: null };
    const { useCase, projects, audit } = setup(project);

    const result = await useCase.execute('actor-id', 'organization-id', 'project-id');

    expect(result).toBe(project);
    expect(projects.save).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the project does not exist', async () => {
    const { useCase, projects, audit } = setup(null);

    await expect(
      useCase.execute('actor-id', 'organization-id', 'project-id'),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(projects.save).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('enforces project management before touching the repository', async () => {
    const { useCase, projects, organizations } = setup(archivedProject());
    organizations.requireProjectManager.mockRejectedValueOnce(
      new Error('Project management access is required'),
    );

    await expect(
      useCase.execute('actor-id', 'organization-id', 'project-id'),
    ).rejects.toThrow('Project management access is required');
    expect(projects.findByOrganizationAndId).not.toHaveBeenCalled();
  });
});
