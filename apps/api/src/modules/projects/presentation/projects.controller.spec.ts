import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { ConflictError } from '../../../common/errors/application-error.js';
import { ProjectsController } from './projects.controller.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const projectId = '550e8400-e29b-41d4-a716-446655440001';
const organizationId = '550e8400-e29b-41d4-a716-446655440002';
const now = new Date('2026-01-01T00:00:00.000Z');
const principal = { id: actorId } as AuthenticatedPrincipal;
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

function request(requestId?: string) {
  return {
    header: vi.fn((name: string) => (name === 'x-request-id' ? requestId : undefined)),
  } as unknown as Request;
}

function createController() {
  return new ProjectsController(
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
    { execute: vi.fn() } as never,
  );
}

function useCaseMock(controller: ProjectsController, name: string) {
  return vi.mocked(
    (controller as unknown as Record<string, { execute: ReturnType<typeof vi.fn> }>)[name].execute,
  );
}

describe('ProjectsController', () => {
  it('wraps list and mutation results in the standard envelope', async () => {
    const controller = createController();
    const list = useCaseMock(controller, 'listProjects');
    const create = useCaseMock(controller, 'createProject');
    const get = useCaseMock(controller, 'getProject');
    const update = useCaseMock(controller, 'updateProject');
    const archive = useCaseMock(controller, 'archiveProject');
    const restore = useCaseMock(controller, 'restoreProject');
    list.mockResolvedValue([project]);
    create.mockResolvedValue(project);
    get.mockResolvedValue(project);
    update.mockResolvedValue(project);
    archive.mockResolvedValue(project);
    restore.mockResolvedValue(project);

    await expect(controller.list(principal, { organizationId })).resolves.toEqual({
      data: [expect.objectContaining({ id: projectId })],
    });
    await expect(controller.create(principal, { organizationId }, {
      githubUrl: project.githubUrl,
    }, request())).resolves.toEqual({
      data: { project: expect.objectContaining({ createdAt: now.toISOString() }) },
    });
    await expect(controller.get(principal, { organizationId, id: projectId })).resolves.toEqual({
      data: { project: expect.objectContaining({ id: projectId }) },
    });
    await expect(controller.update(principal, { organizationId, id: projectId }, {}, request())).resolves.toEqual({
      data: { project: expect.objectContaining({ id: projectId }) },
    });
    await expect(controller.archive(principal, { organizationId, id: projectId }, {}, request())).resolves.toEqual({
      data: { project: expect.objectContaining({ id: projectId }) },
    });
    await expect(controller.restore(principal, { organizationId, id: projectId }, {}, request())).resolves.toEqual({
      data: { project: expect.objectContaining({ id: projectId }) },
    });
  });

  it('passes the request ID and the optional reason into archive and restore', async () => {
    const controller = createController();
    const archive = useCaseMock(controller, 'archiveProject');
    const restore = useCaseMock(controller, 'restoreProject');
    archive.mockResolvedValue(project);
    restore.mockResolvedValue(project);
    const httpRequest = request('request-id');

    await controller.archive(principal, { organizationId, id: projectId }, { reason: '  cleanup  ' }, httpRequest);
    await controller.restore(principal, { organizationId, id: projectId }, { reason: 'restore' }, httpRequest);

    expect(archive).toHaveBeenCalledWith(actorId, organizationId, projectId, {
      requestId: 'request-id',
      reason: 'cleanup',
    });
    expect(restore).toHaveBeenCalledWith(actorId, organizationId, projectId, {
      requestId: 'request-id',
      reason: 'restore',
    });
  });

  it('tolerates an absent, empty, or explicitly null archive/restore body', async () => {
    const controller = createController();
    const archive = useCaseMock(controller, 'archiveProject');
    const restore = useCaseMock(controller, 'restoreProject');
    archive.mockResolvedValue(project);
    restore.mockResolvedValue(project);

    await controller.archive(principal, { organizationId, id: projectId }, undefined, request('request-id'));
    await controller.restore(principal, { organizationId, id: projectId }, { reason: null }, request('request-id'));

    expect(archive).toHaveBeenCalledWith(actorId, organizationId, projectId, {
      requestId: 'request-id',
      reason: '',
    });
    expect(restore).toHaveBeenCalledWith(actorId, organizationId, projectId, {
      requestId: 'request-id',
      reason: '',
    });
  });

  it('propagates a typed conflict with its 409 status from a mutation use case', async () => {
    const controller = createController();
    const restore = useCaseMock(controller, 'restoreProject');
    restore.mockRejectedValue(new ConflictError('Archived projects cannot be updated'));

    await expect(
      controller.restore(principal, { organizationId, id: projectId }, {}, request()),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
  });

  it('passes the request ID into create and update', async () => {
    const controller = createController();
    const create = useCaseMock(controller, 'createProject');
    const update = useCaseMock(controller, 'updateProject');
    create.mockResolvedValue(project);
    update.mockResolvedValue(project);
    const httpRequest = request('request-id');

    await controller.create(principal, { organizationId }, { githubUrl: project.githubUrl }, httpRequest);
    await controller.update(principal, { organizationId, id: projectId }, {}, httpRequest);

    expect(create).toHaveBeenCalledWith(actorId, organizationId, expect.anything(), {
      requestId: 'request-id',
    });
    expect(update).toHaveBeenCalledWith(actorId, organizationId, projectId, expect.anything(), {
      requestId: 'request-id',
    });
  });

  it('rejects invalid route parameters and invalid use-case output', async () => {
    const controller = createController();
    const get = useCaseMock(controller, 'getProject');
    get.mockResolvedValue(project);

    await expect(controller.get(principal, { organizationId, id: 'not-a-uuid' })).rejects.toThrow();

    const list = useCaseMock(controller, 'listProjects');
    list.mockResolvedValue([{ ...project, id: 'not-a-uuid' }]);
    await expect(controller.list(principal, { organizationId })).rejects.toThrow();
  });
});
