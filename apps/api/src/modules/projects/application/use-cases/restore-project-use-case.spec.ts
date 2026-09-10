import { describe, expect, it, vi } from 'vitest';
import {
  ForbiddenError,
  NotFoundError,
} from '../../../../common/errors/application-error.js';
import { ProjectStatus } from '../../domain/project.js';
import { RestoreProjectUseCase } from './restore-project-use-case.js';

type ProjectFixture = {
  id: string;
  organizationId: string;
  status: ProjectStatus;
  archivedAt: Date | null;
  updatedAt: Date;
};

type TransitionInput = {
  organizationId: string;
  id: string;
  from: ProjectStatus;
  to: ProjectStatus;
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

/**
 * In-memory stand-in for the conditional write: the transition applies only while the stored
 * status still equals `from`, so of two callers that both pass the guard exactly one wins. The
 * body runs synchronously, which is what makes the concurrent regression deterministic.
 */
function repository(project: ProjectFixture | null) {
  const state: ProjectFixture | null = project ? { ...project } : null;
  return {
    state,
    transitionStatus: vi.fn(async (input: TransitionInput) => {
      if (!state) return null;
      if (state.status !== input.from) return { applied: false, project: { ...state } };
      state.status = input.to;
      state.archivedAt = input.archivedAt;
      state.updatedAt = input.updatedAt;
      return { applied: true, project: { ...state } };
    }),
  };
}

function setup(project: ProjectFixture | null = archivedProject()) {
  const projects = repository(project);
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
  it('restores an archived project through the conditional transition and writes one audit record', async () => {
    const { useCase, projects, audit, organizations } = setup();

    const result = await useCase.execute('actor-id', 'organization-id', 'project-id');

    expect(result.status).toBe(ProjectStatus.ACTIVE);
    expect(result.archivedAt).toBeNull();
    expect(projects.transitionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'organization-id',
        id: 'project-id',
        from: ProjectStatus.ARCHIVED,
        to: ProjectStatus.ACTIVE,
        archivedAt: null,
      }),
    );
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
    const { useCase, audit } = setup();

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

    expect(result.status).toBe(ProjectStatus.ACTIVE);
    expect(result.archivedAt).toBeNull();
    // The transition was attempted (that is the atomic guard) but did not apply, so nothing is
    // written: a repeated restore must not add a second PROJECT_RESTORED row.
    expect(projects.transitionStatus).toHaveBeenCalledOnce();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('writes no second audit row when a concurrent restore loses the transition race', async () => {
    const { useCase, audit } = setup();

    const [first, second] = await Promise.all([
      useCase.execute('actor-id', 'organization-id', 'project-id', { requestId: 'first-request' }),
      useCase.execute('actor-id', 'organization-id', 'project-id', { requestId: 'second-request' }),
    ]);

    expect(first.status).toBe(ProjectStatus.ACTIVE);
    expect(second.status).toBe(ProjectStatus.ACTIVE);
    expect(audit.record).toHaveBeenCalledOnce();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'first-request' }),
    );
  });

  it('throws NotFoundError when the project does not exist', async () => {
    const { useCase, audit } = setup(null);

    await expect(
      useCase.execute('actor-id', 'organization-id', 'project-id'),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('enforces project management before touching the repository', async () => {
    const { useCase, projects, organizations } = setup();
    organizations.requireProjectManager.mockRejectedValueOnce(
      new ForbiddenError('Project management access is required'),
    );

    const error = await useCase
      .execute('actor-id', 'organization-id', 'project-id')
      .then(
        () => null,
        (caught: unknown) => caught,
      );

    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error).toMatchObject({ code: 'FORBIDDEN', status: 403 });
    expect(projects.transitionStatus).not.toHaveBeenCalled();
  });
});
