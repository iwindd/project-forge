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

type TransitionInput = {
  organizationId: string;
  id: string;
  from: ProjectStatus;
  to: ProjectStatus;
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

/**
 * In-memory stand-in for the conditional write: the transition applies only while the stored
 * status still equals `from`, so of two callers that both pass the guard exactly one wins. The
 * body runs synchronously, which is what makes the concurrent regression deterministic.
 */
function repository(project: ProjectFixture) {
  const state = { ...project };
  return {
    state,
    transitionStatus: vi.fn(async (input: TransitionInput) => {
      if (state.status !== input.from) return { applied: false, project: { ...state } };
      state.status = input.to;
      state.archivedAt = input.archivedAt;
      state.updatedAt = input.updatedAt;
      return { applied: true, project: { ...state } };
    }),
  };
}

function setup(project: ProjectFixture = activeProject()) {
  const projects = repository(project);
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
  it('archives the project through the conditional transition and writes one audit record', async () => {
    const { useCase, projects, audit, organizations } = setup();

    const result = await useCase.execute('actor-id', 'organization-id', 'project-id');

    expect(result.status).toBe(ProjectStatus.ARCHIVED);
    expect(result.archivedAt).not.toBeNull();
    expect(projects.transitionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'organization-id',
        id: 'project-id',
        from: ProjectStatus.ACTIVE,
        to: ProjectStatus.ARCHIVED,
      }),
    );
    expect(organizations.requireProjectManager).toHaveBeenCalledWith(
      'actor-id',
      'organization-id',
    );
    expect(audit.record).toHaveBeenCalledOnce();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROJECT_ARCHIVED',
        before: { status: ProjectStatus.ACTIVE },
        after: { status: ProjectStatus.ARCHIVED },
      }),
    );
  });

  it('records the optional reason and request ID when supplied', async () => {
    const { useCase, audit } = setup();

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

    expect(result.status).toBe(ProjectStatus.ARCHIVED);
    expect(result.archivedAt).not.toBeNull();
    // The transition was attempted (that is the atomic guard) but did not apply, so nothing is
    // written: a repeated archive must not add a second PROJECT_ARCHIVED row.
    expect(projects.transitionStatus).toHaveBeenCalledOnce();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('writes no second audit row when a concurrent archive loses the transition race', async () => {
    const { useCase, audit } = setup();

    const [first, second] = await Promise.all([
      useCase.execute('actor-id', 'organization-id', 'project-id', { requestId: 'first-request' }),
      useCase.execute('actor-id', 'organization-id', 'project-id', { requestId: 'second-request' }),
    ]);

    expect(first.status).toBe(ProjectStatus.ARCHIVED);
    expect(second.status).toBe(ProjectStatus.ARCHIVED);
    expect(audit.record).toHaveBeenCalledOnce();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'first-request' }),
    );
  });
});
