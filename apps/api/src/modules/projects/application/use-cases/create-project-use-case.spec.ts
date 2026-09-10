import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../../../common/errors/application-error.js';
import { ProjectStatus } from '../../domain/project.js';
import { createProjectSchema } from '../../presentation/dto/project.schemas.js';
import { CreateProjectUseCase } from './create-project-use-case.js';

const input = {
  name: '',
  githubUrl: 'https://github.com/acme/demo.git',
  sourceBranch: 'main',
  targetBranch: 'main',
  nodeVersion: '',
  environmentMetadata: { DATABASE_URL: 'do-not-store-this' },
};

function unitOfWork() {
  return { run: vi.fn(async <T>(work: () => Promise<T>) => work()) };
}

function uniqueConstraintViolation() {
  return new UniqueConstraintViolationException(
    new Error(
      'duplicate key value violates unique constraint "projects_organization_id_github_url_unique"',
    ),
  );
}

function setup(existing: { id: string; status: ProjectStatus } | null = null) {
  const projects = {
    findByOrganizationAndGithubUrl: vi.fn(async () => existing),
    save: vi.fn(async () => undefined),
  };
  const organizations = { requireProjectManager: vi.fn(async () => undefined) };
  const audit = { record: vi.fn(async () => undefined) };
  const useCase = new CreateProjectUseCase(
    projects as never,
    organizations as never,
    audit as never,
    unitOfWork() as never,
  );
  return { useCase, projects, organizations, audit };
}

describe('CreateProjectUseCase', () => {
  it('normalizes a GitHub URL and masks environment values', async () => {
    const { useCase, projects, organizations, audit } = setup();

    const project = await useCase.execute('actor-id', 'organization-id', input);

    expect(project.githubUrl).toBe('https://github.com/acme/demo');
    expect(project.name).toBe('demo');
    expect(project.organizationId).toBe('organization-id');
    expect(project.environmentMetadata).toEqual({ DATABASE_URL: 'configured' });
    expect(project.status).toBe(ProjectStatus.ACTIVE);
    expect(projects.findByOrganizationAndGithubUrl).toHaveBeenCalledWith(
      'organization-id',
      'https://github.com/acme/demo',
    );
    expect(organizations.requireProjectManager).toHaveBeenCalledWith(
      'actor-id',
      'organization-id',
    );
    expect(audit.record).toHaveBeenCalledOnce();
  });

  it('persists the supplied branch and runtime metadata on the saved record', async () => {
    const { useCase, projects } = setup();

    await useCase.execute('actor-id', 'organization-id', {
      ...input,
      sourceBranch: 'release',
      targetBranch: 'production',
      nodeVersion: '20.11.0',
    });

    expect(projects.save).toHaveBeenCalledOnce();
    expect(projects.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceBranch: 'release',
        targetBranch: 'production',
        nodeVersion: '20.11.0',
      }),
    );
  });

  it('applies the schema branch and runtime defaults when the request omits them', async () => {
    const { useCase, projects } = setup();

    await useCase.execute(
      'actor-id',
      'organization-id',
      createProjectSchema.parse({ githubUrl: input.githubUrl }),
    );

    expect(projects.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceBranch: 'main',
        targetBranch: 'main',
        nodeVersion: null,
      }),
    );
  });

  it('records the request ID on the audit event when supplied', async () => {
    const { useCase, audit } = setup();

    await useCase.execute('actor-id', 'organization-id', input, { requestId: 'request-id' });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'request-id' }),
    );
  });

  it('rejects unsupported and credential-bearing repository URLs', async () => {
    const { useCase, projects } = setup();

    await expect(
      useCase.execute('owner-id', 'organization-id', { ...input, githubUrl: 'https://git.example.com/acme/demo' }),
    ).rejects.toThrow('Only GitHub HTTPS repository URLs are supported');
    await expect(
      useCase.execute('owner-id', 'organization-id', { ...input, githubUrl: 'https://user:secret@github.com/acme/demo' }),
    ).rejects.toThrow('Only GitHub HTTPS repository URLs are supported');
    expect(projects.save).not.toHaveBeenCalled();
  });

  it.each([ProjectStatus.ACTIVE, ProjectStatus.ARCHIVED])(
    'rejects a duplicate normalized repository when the existing record is %s',
    async (status) => {
      const { useCase, projects, audit } = setup({ id: 'existing-project-id', status });

      await expect(
        useCase.execute('actor-id', 'organization-id', input),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(projects.findByOrganizationAndGithubUrl).toHaveBeenCalledWith(
        'organization-id',
        'https://github.com/acme/demo',
      );
      expect(projects.save).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    },
  );

  it('rejects a differently-cased repository URL of an existing project as a duplicate', async () => {
    const { useCase, projects, audit } = setup({
      id: 'existing-project-id',
      status: ProjectStatus.ACTIVE,
    });

    await expect(
      useCase.execute('actor-id', 'organization-id', {
        ...input,
        githubUrl: 'https://github.com/ACME/Demo.git',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(projects.findByOrganizationAndGithubUrl).toHaveBeenCalledWith(
      'organization-id',
      'https://github.com/acme/demo',
    );
    expect(projects.save).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('maps a concurrent duplicate repository violation to a typed 409 conflict', async () => {
    const { useCase, projects, audit } = setup();
    projects.save.mockRejectedValueOnce(uniqueConstraintViolation());

    const error = await useCase.execute('actor-id', 'organization-id', input).then(
      () => null,
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toMatchObject({
      code: 'CONFLICT',
      status: 409,
      message: 'A project with this repository already exists in the organization',
    });
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('does not swallow unrelated repository save failures', async () => {
    const { useCase, projects } = setup();
    projects.save.mockRejectedValueOnce(new Error('connection lost'));

    await expect(useCase.execute('actor-id', 'organization-id', input)).rejects.toThrow(
      'connection lost',
    );
  });
});
