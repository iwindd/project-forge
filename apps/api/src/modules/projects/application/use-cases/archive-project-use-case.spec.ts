import { describe, expect, it, vi } from 'vitest';
import { ProjectStatus } from '../../domain/project.js';
import { ArchiveProjectUseCase } from './archive-project-use-case.js';

type ProjectFixture = {
  id: string;
  organizationId: string;
  status: ProjectStatus;
  archivedAt: Date | null;
  updatedAt: Date;
};

function activeProject(): ProjectFixture {
  return {
    id: 'project-id',
    organizationId: 'organization-id',
    status: ProjectStatus.ACTIVE,
    archivedAt: null,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function setup(project: ProjectFixture) {
  const projects = {
    findByOrganizationAndId: vi.fn(async () => project),
    save: vi.fn(async () => undefined),
  };
  const audit = { record: vi.fn(async () => undefined) };
  const organizations = { requireProjectManager: vi.fn(async () => undefined) };
  const unitOfWork = { run: vi.fn(async <T>(work: () => Promise<T>) => work()) };
  const useCase = new ArchiveProjectUseCase(
    projects as never,
    organizations as never,
    audit as never,
    unitOfWork as never,
  );
  return { useCase, projects, audit, organizations };
}

describe('ArchiveProjectUseCase', () => {
  it('archives the owner project and writes an audit record', async () => {
    const { useCase, projects, audit, organizations } = setup(activeProject());

    const result = await useCase.execute('actor-id', 'organization-id', 'project-id');

    expect(result.status).toBe(ProjectStatus.ARCHIVED);
    expect(projects.save).toHaveBeenCalledOnce();
    expect(organizations.requireProjectManager).toHaveBeenCalledWith(
      'actor-id',
      'organization-id',
    );
    expect(audit.record).toHaveBeenCalledOnce();
  });

  it('records the optional reason and request ID when supplied', async () => {
    const { useCase, audit } = setup(activeProject());

    await useCase.execute('actor-id', 'organization-id', 'project-id', {
      reason: 'superseded',
      requestId: 'request-id',
    });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'superseded', requestId: 'request-id' }),
    );
  });

  it('is a safe no-op when the project is already archived', async () => {
    const project = { ...activeProject(), status: ProjectStatus.ARCHIVED, archivedAt: new Date() };
    const { useCase, projects, audit } = setup(project);

    const result = await useCase.execute('actor-id', 'organization-id', 'project-id');

    expect(result).toBe(project);
    expect(projects.save).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
