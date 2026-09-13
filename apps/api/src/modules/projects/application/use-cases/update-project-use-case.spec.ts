import { describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../../../common/errors/application-error.js';
import { DUPLICATE_REPOSITORY_CONFLICT_MESSAGE } from '../../application/ports/project.repository.js';
import { ProjectStatus } from '../../domain/project.js';
import { UpdateProjectUseCase } from './update-project-use-case.js';

function project(overrides: Record<string, unknown> = {}) {
  return {
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
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    archivedAt: null,
    ...overrides,
  };
}

function setup(
  record = project() as ReturnType<typeof project>,
  collision: { id: string; status: ProjectStatus } | null = null,
) {
  const projects = {
    findByOrganizationAndId: vi.fn(async () => record),
    findByOrganizationAndGithubUrl: vi.fn(async () => collision),
    save: vi.fn(async () => undefined),
  };
  const audit = { record: vi.fn(async () => undefined) };
  const organizations = { requireProjectManager: vi.fn(async () => undefined) };
  const unitOfWork = { run: vi.fn(async <T>(work: () => Promise<T>) => work()) };
  const useCase = new UpdateProjectUseCase(
    projects as never,
    organizations as never,
    audit as never,
    unitOfWork as never,
  );
  return { useCase, projects, audit, organizations };
}

describe('UpdateProjectUseCase', () => {
  it('updates project fields and writes an audit record', async () => {
    const { useCase, projects, audit, organizations } = setup();

    const result = await useCase.execute('actor-id', 'organization-id', 'project-id', {
      name: 'New name',
    });

    expect(result.name).toBe('New name');
    expect(projects.save).toHaveBeenCalledOnce();
    expect(organizations.requireProjectManager).toHaveBeenCalledWith('actor-id', 'organization-id');
    expect(audit.record).toHaveBeenCalledOnce();
  });

  it('propagates branch and runtime changes to the saved record and the audit payload', async () => {
    const { useCase, projects, audit } = setup();

    const result = await useCase.execute('actor-id', 'organization-id', 'project-id', {
      sourceBranch: 'release',
      targetBranch: 'production',
      nodeVersion: '20.11.0',
    });

    expect(result.sourceBranch).toBe('release');
    expect(result.targetBranch).toBe('production');
    expect(result.nodeVersion).toBe('20.11.0');
    expect(projects.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceBranch: 'release',
        targetBranch: 'production',
        nodeVersion: '20.11.0',
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        before: {
          name: 'Old name',
          githubUrl: 'https://github.com/acme/demo',
          githubOwner: 'acme',
          githubRepo: 'demo',
          sourceBranch: 'main',
          targetBranch: 'main',
          nodeVersion: null,
        },
        after: {
          name: 'Old name',
          githubUrl: 'https://github.com/acme/demo',
          githubOwner: 'acme',
          githubRepo: 'demo',
          sourceBranch: 'release',
          targetBranch: 'production',
          nodeVersion: '20.11.0',
        },
      }),
    );
  });

  it('masks environment metadata on the update side and stores only the masked keys', async () => {
    const { useCase, projects, audit } = setup();

    const result = await useCase.execute('actor-id', 'organization-id', 'project-id', {
      environmentMetadata: {
        DATABASE_URL: 'postgres://user:secret@localhost/db',
        API_TOKEN: 'sk-live-token',
      },
    });

    expect(result.environmentMetadata).toEqual({
      DATABASE_URL: 'configured',
      API_TOKEN: 'configured',
    });
    expect(projects.save).toHaveBeenCalledWith(
      expect.objectContaining({
        environmentMetadata: {
          DATABASE_URL: 'configured',
          API_TOKEN: 'configured',
        },
      }),
    );
    expect(audit.record).toHaveBeenCalledOnce();
  });

  it('rejects an update to an archived project with a typed conflict', async () => {
    const archived = project({ status: ProjectStatus.ARCHIVED, archivedAt: new Date() });
    const { useCase, projects, audit } = setup(archived);

    await expect(
      useCase.execute('actor-id', 'organization-id', 'project-id', { name: 'New name' }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(projects.save).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it.each([ProjectStatus.ACTIVE, ProjectStatus.ARCHIVED])(
    'rejects a repository change that collides with a %s project in the organization',
    async (status) => {
      const { useCase, projects, audit } = setup(project(), { id: 'other-project-id', status });

      const error = await useCase
        .execute('actor-id', 'organization-id', 'project-id', {
          githubUrl: 'https://github.com/acme/taken',
        })
        .then(
          () => null,
          (caught: unknown) => caught,
        );

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toMatchObject({
        code: 'CONFLICT',
        status: 409,
        message: DUPLICATE_REPOSITORY_CONFLICT_MESSAGE,
      });
      expect(projects.save).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    },
  );

  it('allows a repository change to a free URL', async () => {
    const { useCase, projects, audit } = setup(project(), null);

    const result = await useCase.execute('actor-id', 'organization-id', 'project-id', {
      githubUrl: 'https://github.com/acme/available.git',
    });

    expect(result.githubUrl).toBe('https://github.com/acme/available');
    expect(result.githubOwner).toBe('acme');
    expect(result.githubRepo).toBe('available');
    expect(projects.save).toHaveBeenCalledOnce();
    expect(audit.record).toHaveBeenCalledOnce();
  });

  it('does not look up a collision when the repository URL is unchanged', async () => {
    const { useCase, projects } = setup();

    await useCase.execute('actor-id', 'organization-id', 'project-id', {
      githubUrl: 'https://github.com/acme/demo',
    });

    expect(projects.findByOrganizationAndGithubUrl).not.toHaveBeenCalled();
    expect(projects.save).toHaveBeenCalledOnce();
  });
});
