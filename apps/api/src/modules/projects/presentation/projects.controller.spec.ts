import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { ProjectsController } from './projects.controller.js';

const ownerId = '550e8400-e29b-41d4-a716-446655440000';
const projectId = '550e8400-e29b-41d4-a716-446655440001';
const organizationId = '550e8400-e29b-41d4-a716-446655440002';
const now = new Date('2026-01-01T00:00:00.000Z');
const principal = { id: ownerId } as AuthenticatedPrincipal;
const project = {
  id: projectId,
  organizationId,
  name: 'Project',
  githubUrl: 'https://github.com/example/project',
  githubOwner: 'example',
  githubRepo: 'project',
  sourceBranch: 'main',
  targetBranch: 'main',
  nodeVersion: null,
  environmentMetadata: null,
  status: 'ACTIVE',
  createdAt: now,
  updatedAt: now,
  archivedAt: null,
};

function createController() {
  return new ProjectsController(
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
  );
}

describe('ProjectsController', () => {
  it('wraps list and mutation results in the standard envelope', async () => {
    const controller = createController();
    const list = vi.mocked(
      (controller as unknown as { listProjects: { execute: ReturnType<typeof vi.fn> } })
        .listProjects.execute,
    );
    const create = vi.mocked(
      (controller as unknown as { createProject: { execute: ReturnType<typeof vi.fn> } })
        .createProject.execute,
    );
    const get = vi.mocked(
      (controller as unknown as { getProject: { execute: ReturnType<typeof vi.fn> } })
        .getProject.execute,
    );
    const update = vi.mocked(
      (controller as unknown as { updateProject: { execute: ReturnType<typeof vi.fn> } })
        .updateProject.execute,
    );
    const archive = vi.mocked(
      (controller as unknown as { archiveProject: { execute: ReturnType<typeof vi.fn> } })
        .archiveProject.execute,
    );
    list.mockResolvedValue([project]);
    create.mockResolvedValue(project);
    get.mockResolvedValue(project);
    update.mockResolvedValue(project);
    archive.mockResolvedValue(project);

    await expect(controller.list(principal, { organizationId })).resolves.toEqual({
      data: [expect.objectContaining({ id: projectId })],
    });
    await expect(controller.create(principal, { organizationId }, {
      githubUrl: project.githubUrl,
    })).resolves.toEqual({
      data: { project: expect.objectContaining({ createdAt: now.toISOString() }) },
    });
    await expect(controller.get(principal, { organizationId, id: projectId })).resolves.toEqual({
      data: { project: expect.objectContaining({ id: projectId }) },
    });
    await expect(controller.update(principal, { organizationId, id: projectId }, {})).resolves.toEqual({
      data: { project: expect.objectContaining({ id: projectId }) },
    });
    await expect(controller.archive(principal, { organizationId, id: projectId })).resolves.toEqual({
      data: { project: expect.objectContaining({ id: projectId }) },
    });
  });

  it('rejects invalid route parameters and invalid use-case output', async () => {
    const controller = createController();
    const get = vi.mocked(
      (controller as unknown as { getProject: { execute: ReturnType<typeof vi.fn> } })
        .getProject.execute,
    );
    get.mockResolvedValue(project);

    await expect(controller.get(principal, { organizationId, id: 'not-a-uuid' })).rejects.toThrow();

    const list = vi.mocked(
      (controller as unknown as { listProjects: { execute: ReturnType<typeof vi.fn> } })
        .listProjects.execute,
    );
    list.mockResolvedValue([{ ...project, id: 'not-a-uuid' }]);
    await expect(controller.list(principal, { organizationId })).rejects.toThrow();
  });
});
