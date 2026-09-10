import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../../../common/errors/application-error.js';
import { DUPLICATE_REPOSITORY_CONFLICT_MESSAGE } from '../../application/ports/project.repository.js';
import { ProjectStatus } from '../../domain/project.js';
import type { ProjectRecord } from '../../domain/project.js';
import { MikroOrmProjectRepository } from './mikro-orm-project.repository.js';

function uniqueConstraintViolation() {
  return new UniqueConstraintViolationException(
    new Error(
      'duplicate key value violates unique constraint "projects_organization_id_github_url_unique"',
    ),
  );
}

function project(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    id: 'project-id',
    organizationId: 'organization-id',
    name: 'demo',
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

function setup(existing: unknown = null) {
  const em = {
    findOne: vi.fn(async () => existing),
    create: vi.fn(() => ({})),
    persist: vi.fn(),
    flush: vi.fn(async () => undefined),
  };
  const repository = new MikroOrmProjectRepository(em as never);
  return { repository, em };
}

describe('MikroOrmProjectRepository', () => {
  it('flushes the record it persists, so save owns the write', async () => {
    const { repository, em } = setup();

    await repository.save(project());

    expect(em.persist).toHaveBeenCalledOnce();
    expect(em.flush).toHaveBeenCalledOnce();
  });

  it('translates the unique-constraint violation raised at the flush of an insert into a typed 409 conflict', async () => {
    const { repository, em } = setup();
    em.flush.mockRejectedValueOnce(uniqueConstraintViolation());

    const error = await repository.save(project()).then(
      () => null,
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toMatchObject({
      code: 'CONFLICT',
      status: 409,
      message: DUPLICATE_REPOSITORY_CONFLICT_MESSAGE,
    });
  });

  it('translates the unique-constraint violation raised at the flush of an update into a typed 409 conflict', async () => {
    const { repository, em } = setup({ id: 'project-id' });
    em.flush.mockRejectedValueOnce(uniqueConstraintViolation());

    const error = await repository.save(project({ name: 'Renamed' })).then(
      () => null,
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toMatchObject({ code: 'CONFLICT', status: 409 });
  });

  it('does not swallow unrelated flush failures', async () => {
    const { repository, em } = setup();
    em.flush.mockRejectedValueOnce(new Error('connection lost'));

    await expect(repository.save(project())).rejects.toThrow('connection lost');
  });
});
