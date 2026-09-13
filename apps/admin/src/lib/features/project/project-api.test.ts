import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '@/lib/store';
import { projectApi } from './project-api';
import { parseProjectListResponse, parseProjectResponse } from './project-schemas';

const organizationId = '00000000-0000-0000-0000-000000000000';
const projectId = '11111111-1111-1111-1111-111111111111';

const project = {
  id: projectId,
  organizationId,
  name: 'Project A',
  githubUrl: 'https://github.com/owner/repository',
  githubOwner: 'owner',
  githubRepo: 'repository',
  sourceBranch: 'main',
  targetBranch: 'main',
  nodeVersion: null,
  environmentMetadata: null,
  status: 'ACTIVE' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
};

function createStore() {
  return makeStore({ auth: { user: null } });
}

function stubJsonResponse(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function stubErrorResponse(status: number, code: string) {
  return stubJsonResponse(
    {
      error: {
        code,
        message: `${code} error message`,
        details: {},
        requestId: `request-${status}`,
      },
    },
    status,
  );
}

function readRequest(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls[0][0] as Request;
}

describe('project transport contracts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists projects through the organization-scoped URL', async () => {
    const fetchMock = stubJsonResponse({ data: [project] });

    const result = await createStore().dispatch(projectApi.endpoints.getProjects.initiate({ organizationId }));

    expect(result.data).toEqual([project]);
    const request = readRequest(fetchMock);
    expect(request.method).toBe('GET');
    expect(request.url).toContain(`/api/v1/organizations/${organizationId}/projects`);
  });

  it('creates a project and parses the mutation envelope', async () => {
    const fetchMock = stubJsonResponse({ data: { project } });

    const result = await createStore().dispatch(
      projectApi.endpoints.createProject.initiate({
        organizationId,
        githubUrl: project.githubUrl,
      }),
    );

    expect(result.data).toEqual({ project });
    const request = readRequest(fetchMock);
    expect(request.method).toBe('POST');
    expect(request.url).toContain(`/api/v1/organizations/${organizationId}/projects`);
    expect(await request.clone().text()).toContain(project.githubUrl);
  });

  it('updates a project through the project-scoped URL', async () => {
    const fetchMock = stubJsonResponse({ data: { project } });

    const result = await createStore().dispatch(
      projectApi.endpoints.updateProject.initiate({
        organizationId,
        projectId,
        name: project.name,
      }),
    );

    expect(result.data).toEqual({ project });
    const request = readRequest(fetchMock);
    expect(request.method).toBe('PATCH');
    expect(request.url).toContain(`/api/v1/organizations/${organizationId}/projects/${projectId}`);
  });

  it('archives a project through the archive route', async () => {
    const fetchMock = stubJsonResponse({
      data: { project: { ...project, status: 'ARCHIVED' } },
    });

    const result = await createStore().dispatch(
      projectApi.endpoints.archiveProject.initiate({
        organizationId,
        projectId,
      }),
    );

    expect(result.data?.project.status).toBe('ARCHIVED');
    const request = readRequest(fetchMock);
    expect(request.method).toBe('POST');
    expect(request.url).toContain(`/api/v1/organizations/${organizationId}/projects/${projectId}/archive`);
  });

  it('restores a project through the restore route', async () => {
    const fetchMock = stubJsonResponse({ data: { project } });

    const result = await createStore().dispatch(
      projectApi.endpoints.restoreProject.initiate({
        organizationId,
        projectId,
      }),
    );

    expect(result.data).toEqual({ project });
    const request = readRequest(fetchMock);
    expect(request.method).toBe('POST');
    expect(request.url).toContain(`/api/v1/organizations/${organizationId}/projects/${projectId}/restore`);
  });

  it('rejects a malformed list payload', async () => {
    stubJsonResponse({ data: [{ ...project, id: 'project-id' }] });

    const result = await createStore().dispatch(projectApi.endpoints.getProjects.initiate({ organizationId }));

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
  });

  it('rejects a malformed mutation payload', async () => {
    stubJsonResponse({ data: { project: { ...project, status: 'DELETED' } } });

    const result = await createStore().dispatch(
      projectApi.endpoints.createProject.initiate({
        organizationId,
        githubUrl: project.githubUrl,
      }),
    );

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
  });

  it('parses the unwrapped payload the base query delivers', () => {
    expect(parseProjectListResponse([project])).toEqual([project]);
    expect(parseProjectResponse({ project })).toEqual({ project });
  });

  it('rejects output that is not the documented payload', () => {
    expect(() => parseProjectListResponse({ data: [project] })).toThrow();
    expect(() => parseProjectResponse({ data: { project } })).toThrow();
  });

  it.each([
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [422, 'INVALID_INPUT'],
  ] as const)('surfaces the API %s error envelope for the project list request', async (status, code) => {
    stubErrorResponse(status, code);

    const result = await createStore().dispatch(projectApi.endpoints.getProjects.initiate({ organizationId }));

    expect(result.data).toBeUndefined();
    expect(result.error).toMatchObject({
      status,
      data: {
        error: {
          code,
          message: `${code} error message`,
          details: {},
          requestId: `request-${status}`,
        },
      },
    });
  });

  it.each([
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [422, 'INVALID_INPUT'],
  ] as const)('surfaces the API %s error envelope for a project mutation', async (status, code) => {
    stubErrorResponse(status, code);

    const result = await createStore().dispatch(
      projectApi.endpoints.archiveProject.initiate({
        organizationId,
        projectId,
      }),
    );

    expect(result.data).toBeUndefined();
    expect(result.error).toMatchObject({
      status,
      data: {
        error: {
          code,
          requestId: `request-${status}`,
        },
      },
    });
  });
});
