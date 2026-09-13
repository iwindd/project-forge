import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUDIT_LOGGER } from '../../../common/audit/audit.port.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { SESSION_AUTHENTICATOR } from '../../../common/auth/auth.types.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import { UNIT_OF_WORK } from '../../../common/database/unit-of-work.port.js';
import { ForbiddenError, NotFoundError } from '../../../common/errors/application-error.js';
import { PublicErrorFilter } from '../../../common/errors/public-error.filter.js';
import { SECURITY_LOGGER } from '../../../common/security/security-log.port.js';
import { OrganizationService } from '../../organizations/application/organization.service.js';
import { AccessStatus, UserRole } from '../../users/domain/user.js';
import { ArchiveProjectUseCase } from '../application/use-cases/archive-project-use-case.js';
import { CreateProjectUseCase } from '../application/use-cases/create-project-use-case.js';
import { GetProjectUseCase } from '../application/use-cases/get-project-use-case.js';
import { ListProjectsUseCase } from '../application/use-cases/list-projects-use-case.js';
import { RestoreProjectUseCase } from '../application/use-cases/restore-project-use-case.js';
import { UpdateProjectUseCase } from '../application/use-cases/update-project-use-case.js';
import { DUPLICATE_REPOSITORY_CONFLICT_MESSAGE, PROJECT_REPOSITORY } from '../application/ports/project.repository.js';
import type { ProjectRepository } from '../application/ports/project.repository.js';
import { ProjectStatus } from '../domain/project.js';
import type { ProjectRecord } from '../domain/project.js';
import { ProjectsController } from './projects.controller.js';

const userId = '550e8400-e29b-41d4-a716-446655440000';
const organizationId = '550e8400-e29b-41d4-a716-446655440001';
const activeProjectId = '550e8400-e29b-41d4-a716-446655440002';
const archivedProjectId = '550e8400-e29b-41d4-a716-446655440003';
const unknownProjectId = '550e8400-e29b-41d4-a716-446655440099';
const createdAt = new Date('2026-01-01T00:00:00.000Z');
const updatedAt = new Date('2026-01-02T00:00:00.000Z');

const principal: AuthenticatedPrincipal = {
  id: userId,
  githubUserId: 'github-user',
  githubLogin: 'github-login',
  name: 'User',
  avatarUrl: null,
  role: UserRole.USER,
  accessStatus: AccessStatus.APPROVED,
  isActive: true,
  createdAt,
  updatedAt,
};

function projectRecord(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    id: activeProjectId,
    organizationId,
    // Deliberately distinctive values so a PATCH that silently re-applies create-time defaults
    // (name -> '', branches -> 'main', nodeVersion -> null, environmentMetadata -> {}) is visible.
    name: 'My Application',
    githubUrl: 'https://github.com/acme/demo',
    githubOwner: 'acme',
    githubRepo: 'demo',
    sourceBranch: 'release',
    targetBranch: 'production',
    nodeVersion: '20.11.0',
    environmentMetadata: { DATABASE_URL: 'configured' },
    status: ProjectStatus.ACTIVE,
    createdAt,
    updatedAt,
    archivedAt: null,
    ...overrides,
  };
}

const archivedProject = projectRecord({
  id: archivedProjectId,
  name: 'Archived demo',
  githubUrl: 'https://github.com/acme/archived-demo',
  githubRepo: 'archived-demo',
  status: ProjectStatus.ARCHIVED,
  archivedAt: updatedAt,
});

/** The audit projection of a project record that a PATCH must leave untouched. */
const unchangedAuditSummary = {
  name: 'My Application',
  githubUrl: 'https://github.com/acme/demo',
  githubOwner: 'acme',
  githubRepo: 'demo',
  sourceBranch: 'release',
  targetBranch: 'production',
  nodeVersion: '20.11.0',
};

describe('projects HTTP contracts', () => {
  let app: INestApplication;
  let baseUrl: string;
  const records: ProjectRecord[] = [];
  const projects: ProjectRepository = {
    findByOrganizationId: async (scopedOrganizationId: string) =>
      records.filter((record) => record.organizationId === scopedOrganizationId),
    findByOrganizationAndId: async (scopedOrganizationId: string, id: string) =>
      records.find((record) => record.organizationId === scopedOrganizationId && record.id === id) ?? null,
    findByOrganizationAndGithubUrl: async (scopedOrganizationId: string, githubUrl: string) =>
      records.find((record) => record.organizationId === scopedOrganizationId && record.githubUrl === githubUrl) ??
      null,
    transitionStatus: async ({ organizationId: scopedOrganizationId, id, from, to, archivedAt, updatedAt }) => {
      const index = records.findIndex(
        (candidate) => candidate.organizationId === scopedOrganizationId && candidate.id === id,
      );
      if (index === -1) return null;
      const record = records[index];
      if (record.status !== from) return { applied: false, project: { ...record } };
      // Replace the stored entry instead of mutating it, so the seeded fixtures stay pristine.
      const updated = { ...record, status: to, archivedAt, updatedAt };
      records[index] = updated;
      return { applied: true, project: { ...updated } };
    },
    save: async (project: ProjectRecord) => {
      const index = records.findIndex((record) => record.id === project.id);
      if (index === -1) records.push(project);
      else records[index] = project;
    },
  };
  const organizations = {
    requireProjectAccess: vi.fn(async () => undefined),
    requireProjectManager: vi.fn(async () => undefined),
  };
  const audit = { record: vi.fn(async () => undefined) };
  const security = { record: vi.fn(async () => undefined) };
  const unitOfWork = { run: vi.fn(async <T>(work: () => Promise<T>) => work()) };
  const authenticator = {
    principalFromToken: vi.fn(async (token: string | undefined) => (token === 'valid-session' ? principal : null)),
  };

  function authenticatedHeaders(requestId: string): Record<string, string> {
    return { cookie: 'pf_session=valid-session', 'x-request-id': requestId };
  }

  function jsonHeaders(requestId: string): Record<string, string> {
    return { ...authenticatedHeaders(requestId), 'content-type': 'application/json' };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        SessionGuard,
        { provide: SESSION_AUTHENTICATOR, useValue: authenticator },
        { provide: SECURITY_LOGGER, useValue: security },
        { provide: PROJECT_REPOSITORY, useValue: projects },
        { provide: OrganizationService, useValue: organizations },
        { provide: AUDIT_LOGGER, useValue: audit },
        { provide: UNIT_OF_WORK, useValue: unitOfWork },
        ListProjectsUseCase,
        GetProjectUseCase,
        CreateProjectUseCase,
        UpdateProjectUseCase,
        ArchiveProjectUseCase,
        RestoreProjectUseCase,
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new PublicErrorFilter());
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    records.splice(0, records.length, projectRecord(), archivedProject);
  });

  it('returns the standard 401 envelope for an unauthenticated project request', async () => {
    const response = await fetch(`${baseUrl}/api/v1/organizations/${organizationId}/projects`, {
      headers: { 'x-request-id': 'projects-401' },
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Please sign in with GitHub',
        details: {},
        requestId: 'projects-401',
      },
    });
    expect(response.headers.get('x-request-id')).toBe('projects-401');
    expect(security.record).toHaveBeenCalledWith({
      organizationId: null,
      userId: null,
      event: 'AUTHENTICATION_FAILED',
      ipAddress: '127.0.0.1',
      userAgent: 'node',
      metadata: { requestId: 'projects-401', code: 'UNAUTHENTICATED' },
    });
    expect(JSON.stringify(security.record.mock.calls)).not.toContain('pf_session');
  });

  it('returns a 422 envelope when the HTTP body fails presentation validation', async () => {
    const response = await fetch(`${baseUrl}/api/v1/organizations/${organizationId}/projects`, {
      method: 'POST',
      headers: jsonHeaders('projects-422-validation'),
      body: JSON.stringify({ githubUrl: 'not-a-github-url' }),
    });
    const body = (await response.json()) as { error: Record<string, unknown> };

    expect(response.status).toBe(422);
    expect(response.headers.get('x-request-id')).toBe('projects-422-validation');
    expect(body.error).toMatchObject({
      code: 'INVALID_INPUT',
      message: 'Request validation failed',
      requestId: 'projects-422-validation',
    });
    expect(body.error.details).toEqual({
      issues: expect.arrayContaining([expect.objectContaining({ path: ['githubUrl'] })]),
    });
    expect(records).toHaveLength(2);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller is not a member of the organization', async () => {
    organizations.requireProjectAccess.mockRejectedValueOnce(
      new ForbiddenError('You are not a member of this organization'),
    );

    const response = await fetch(`${baseUrl}/api/v1/organizations/${organizationId}/projects`, {
      headers: authenticatedHeaders('projects-403-non-member'),
    });
    const body = (await response.json()) as { error: Record<string, unknown> };

    expect(response.status).toBe(403);
    expect(body.error).toMatchObject({
      code: 'FORBIDDEN',
      details: {},
      requestId: 'projects-403-non-member',
    });
  });

  it('returns 403 when the caller lacks the project.manage permission', async () => {
    organizations.requireProjectManager.mockRejectedValueOnce(
      new ForbiddenError('Project management access is required'),
    );

    const response = await fetch(`${baseUrl}/api/v1/organizations/${organizationId}/projects`, {
      method: 'POST',
      headers: jsonHeaders('projects-403-no-permission'),
      body: JSON.stringify({ githubUrl: 'https://github.com/acme/another-demo' }),
    });
    const body = (await response.json()) as { error: Record<string, unknown> };

    expect(response.status).toBe(403);
    expect(body.error).toMatchObject({
      code: 'FORBIDDEN',
      details: {},
      requestId: 'projects-403-no-permission',
    });
    expect(records).toHaveLength(2);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown project and for an unknown or inactive organization', async () => {
    const projectResponse = await fetch(
      `${baseUrl}/api/v1/organizations/${organizationId}/projects/${unknownProjectId}`,
      { headers: authenticatedHeaders('projects-404-project') },
    );
    const projectBody = await projectResponse.json();

    expect(projectResponse.status).toBe(404);
    expect(projectBody).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Project was not found',
        details: {},
        requestId: 'projects-404-project',
      },
    });

    organizations.requireProjectAccess.mockRejectedValueOnce(new NotFoundError('Organization was not found'));
    const organizationResponse = await fetch(`${baseUrl}/api/v1/organizations/${organizationId}/projects`, {
      headers: authenticatedHeaders('projects-404-organization'),
    });
    const organizationBody = (await organizationResponse.json()) as {
      error: Record<string, unknown>;
    };

    expect(organizationResponse.status).toBe(404);
    expect(organizationBody.error).toMatchObject({
      code: 'NOT_FOUND',
      details: {},
      requestId: 'projects-404-organization',
    });
  });

  it('returns 409 for an update on an archived project and for a duplicate repository', async () => {
    const archivedResponse = await fetch(
      `${baseUrl}/api/v1/organizations/${organizationId}/projects/${archivedProjectId}`,
      {
        method: 'PATCH',
        headers: jsonHeaders('projects-409-archived'),
        body: JSON.stringify({ name: 'Renamed' }),
      },
    );
    const archivedBody = await archivedResponse.json();

    expect(archivedResponse.status).toBe(409);
    expect(archivedBody).toEqual({
      error: {
        code: 'CONFLICT',
        message: 'Archived projects cannot be updated',
        details: {},
        requestId: 'projects-409-archived',
      },
    });

    const duplicateResponse = await fetch(`${baseUrl}/api/v1/organizations/${organizationId}/projects`, {
      method: 'POST',
      headers: jsonHeaders('projects-409-duplicate'),
      body: JSON.stringify({ githubUrl: 'https://github.com/acme/demo' }),
    });
    const duplicateBody = await duplicateResponse.json();

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateBody).toEqual({
      error: {
        code: 'CONFLICT',
        message: DUPLICATE_REPOSITORY_CONFLICT_MESSAGE,
        details: {},
        requestId: 'projects-409-duplicate',
      },
    });
    expect(records).toHaveLength(2);
  });

  it('reads an archived project through both get and list', async () => {
    const listResponse = await fetch(`${baseUrl}/api/v1/organizations/${organizationId}/projects`, {
      headers: authenticatedHeaders('projects-archived-list'),
    });
    const listBody = (await listResponse.json()) as { data: unknown[] };

    expect(listResponse.status).toBe(200);
    expect(listBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: archivedProjectId, status: 'ARCHIVED' }),
        expect.objectContaining({ id: activeProjectId, status: 'ACTIVE' }),
      ]),
    );

    const getResponse = await fetch(`${baseUrl}/api/v1/organizations/${organizationId}/projects/${archivedProjectId}`, {
      headers: authenticatedHeaders('projects-archived-get'),
    });
    const getBody = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(getBody).toEqual({
      data: {
        project: expect.objectContaining({
          id: archivedProjectId,
          status: 'ARCHIVED',
          archivedAt: updatedAt.toISOString(),
        }),
      },
    });
  });

  it('applies a single-field PATCH without resetting the fields the client omitted', async () => {
    const response = await fetch(`${baseUrl}/api/v1/organizations/${organizationId}/projects/${activeProjectId}`, {
      method: 'PATCH',
      headers: jsonHeaders('projects-patch-single-field'),
      body: JSON.stringify({ nodeVersion: '22.0.0' }),
    });
    const body = (await response.json()) as { data: { project: Record<string, unknown> } };

    expect(response.status).toBe(200);

    const persisted = records.find((record) => record.id === activeProjectId);
    expect(persisted).toMatchObject({
      name: 'My Application',
      sourceBranch: 'release',
      targetBranch: 'production',
      nodeVersion: '22.0.0',
      environmentMetadata: { DATABASE_URL: 'configured' },
    });
    expect(body.data.project).toMatchObject({
      name: 'My Application',
      sourceBranch: 'release',
      targetBranch: 'production',
      nodeVersion: '22.0.0',
      environmentMetadata: { DATABASE_URL: 'configured' },
    });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROJECT_UPDATED',
        resourceId: activeProjectId,
        requestId: 'projects-patch-single-field',
        before: unchangedAuditSummary,
        after: { ...unchangedAuditSummary, nodeVersion: '22.0.0' },
      }),
    );
  });

  it('leaves the project unchanged for an empty-body PATCH', async () => {
    const response = await fetch(`${baseUrl}/api/v1/organizations/${organizationId}/projects/${activeProjectId}`, {
      method: 'PATCH',
      headers: jsonHeaders('projects-patch-empty'),
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(200);

    const persisted = records.find((record) => record.id === activeProjectId);
    expect(persisted).toMatchObject({
      name: 'My Application',
      githubUrl: 'https://github.com/acme/demo',
      sourceBranch: 'release',
      targetBranch: 'production',
      nodeVersion: '20.11.0',
      environmentMetadata: { DATABASE_URL: 'configured' },
      status: ProjectStatus.ACTIVE,
      archivedAt: null,
    });

    // The use case always refreshes updatedAt, so the audit before/after must be identical.
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROJECT_UPDATED',
        requestId: 'projects-patch-empty',
        before: unchangedAuditSummary,
        after: unchangedAuditSummary,
      }),
    );
  });

  it('does not rewrite the project name from the repository name on a branch-only PATCH', async () => {
    const response = await fetch(`${baseUrl}/api/v1/organizations/${organizationId}/projects/${activeProjectId}`, {
      method: 'PATCH',
      headers: jsonHeaders('projects-patch-branch-only'),
      body: JSON.stringify({ sourceBranch: 'release-2' }),
    });

    expect(response.status).toBe(200);

    const persisted = records.find((record) => record.id === activeProjectId);
    expect(persisted?.sourceBranch).toBe('release-2');
    expect(persisted?.name).toBe('My Application');
    expect(persisted?.name).not.toBe('demo');
    expect(persisted?.targetBranch).toBe('production');
    expect(persisted?.nodeVersion).toBe('20.11.0');
    expect(persisted?.environmentMetadata).toEqual({ DATABASE_URL: 'configured' });
  });

  it('records a differing before/after for a repository-only PATCH', async () => {
    const response = await fetch(`${baseUrl}/api/v1/organizations/${organizationId}/projects/${activeProjectId}`, {
      method: 'PATCH',
      headers: jsonHeaders('projects-patch-repository-only'),
      body: JSON.stringify({ githubUrl: 'https://github.com/acme/renamed-demo' }),
    });
    const body = (await response.json()) as { data: { project: Record<string, unknown> } };

    expect(response.status).toBe(200);
    expect(body.data.project).toMatchObject({
      name: 'My Application',
      githubUrl: 'https://github.com/acme/renamed-demo',
      githubOwner: 'acme',
      githubRepo: 'renamed-demo',
    });

    const recorded = audit.record.mock.calls as unknown as Array<
      [{ before: Record<string, unknown>; after: Record<string, unknown> }]
    >;
    const auditInput = recorded[0][0];

    expect(auditInput.before.githubUrl).toBe('https://github.com/acme/demo');
    expect(auditInput.after.githubUrl).toBe('https://github.com/acme/renamed-demo');
    // Regression: before and after used to be byte-identical for this PATCH because the audit
    // projections omitted the repository fields entirely.
    expect(auditInput.before).not.toEqual(auditInput.after);
  });

  it('archives an active project and restores an archived project over HTTP', async () => {
    const archiveResponse = await fetch(
      `${baseUrl}/api/v1/organizations/${organizationId}/projects/${activeProjectId}/archive`,
      { method: 'POST', headers: jsonHeaders('projects-archive'), body: JSON.stringify({}) },
    );
    const archiveBody = (await archiveResponse.json()) as {
      data: { project: Record<string, unknown> };
    };

    expect(archiveResponse.status).toBe(200);
    expect(archiveBody.data.project).toMatchObject({ id: activeProjectId, status: 'ARCHIVED' });
    expect(archiveBody.data.project.archivedAt).not.toBeNull();
    expect(records.find((record) => record.id === activeProjectId)?.status).toBe('ARCHIVED');
    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'PROJECT_ARCHIVED', requestId: 'projects-archive' }),
    );

    const restoreResponse = await fetch(
      `${baseUrl}/api/v1/organizations/${organizationId}/projects/${archivedProjectId}/restore`,
      { method: 'POST', headers: jsonHeaders('projects-restore'), body: JSON.stringify({}) },
    );
    const restoreBody = (await restoreResponse.json()) as {
      data: { project: Record<string, unknown> };
    };

    expect(restoreResponse.status).toBe(200);
    expect(restoreBody.data.project).toMatchObject({
      id: archivedProjectId,
      status: 'ACTIVE',
      archivedAt: null,
    });
    expect(audit.record).toHaveBeenCalledTimes(2);
    expect(audit.record).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'PROJECT_RESTORED', requestId: 'projects-restore' }),
    );
  });

  it('adds no further audit row when the archive and restore routes are repeated', async () => {
    const firstArchive = await fetch(
      `${baseUrl}/api/v1/organizations/${organizationId}/projects/${activeProjectId}/archive`,
      { method: 'POST', headers: jsonHeaders('projects-archive-repeat-1'), body: JSON.stringify({}) },
    );
    const secondArchive = await fetch(
      `${baseUrl}/api/v1/organizations/${organizationId}/projects/${activeProjectId}/archive`,
      { method: 'POST', headers: jsonHeaders('projects-archive-repeat-2'), body: JSON.stringify({}) },
    );
    const secondArchiveBody = (await secondArchive.json()) as {
      data: { project: Record<string, unknown> };
    };

    expect(firstArchive.status).toBe(200);
    expect(secondArchive.status).toBe(200);
    expect(secondArchiveBody.data.project).toMatchObject({ status: 'ARCHIVED' });
    expect(audit.record).toHaveBeenCalledTimes(1);

    const firstRestore = await fetch(
      `${baseUrl}/api/v1/organizations/${organizationId}/projects/${archivedProjectId}/restore`,
      { method: 'POST', headers: jsonHeaders('projects-restore-repeat-1'), body: JSON.stringify({}) },
    );
    const secondRestore = await fetch(
      `${baseUrl}/api/v1/organizations/${organizationId}/projects/${archivedProjectId}/restore`,
      { method: 'POST', headers: jsonHeaders('projects-restore-repeat-2'), body: JSON.stringify({}) },
    );
    const secondRestoreBody = (await secondRestore.json()) as {
      data: { project: Record<string, unknown> };
    };

    expect(firstRestore.status).toBe(200);
    expect(secondRestore.status).toBe(200);
    expect(secondRestoreBody.data.project).toMatchObject({
      status: 'ACTIVE',
      archivedAt: null,
    });
    expect(audit.record).toHaveBeenCalledTimes(2);
  });

  it('returns 403 without project.manage on the archive route and echoes the request ID', async () => {
    organizations.requireProjectManager.mockRejectedValueOnce(
      new ForbiddenError('Project management access is required'),
    );

    const response = await fetch(
      `${baseUrl}/api/v1/organizations/${organizationId}/projects/${activeProjectId}/archive`,
      { method: 'POST', headers: jsonHeaders('projects-archive-403'), body: JSON.stringify({}) },
    );
    const body = (await response.json()) as { error: Record<string, unknown> };

    expect(response.status).toBe(403);
    expect(body.error).toMatchObject({
      code: 'FORBIDDEN',
      details: {},
      requestId: 'projects-archive-403',
    });
    expect(records.find((record) => record.id === activeProjectId)?.status).toBe('ACTIVE');
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('accepts an archive POST with no body at all', async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/organizations/${organizationId}/projects/${activeProjectId}/archive`,
      { method: 'POST', headers: authenticatedHeaders('projects-archive-no-body') },
    );
    const body = (await response.json()) as { data: { project: Record<string, unknown> } };

    expect(response.status).toBe(200);
    expect(body.data.project).toMatchObject({ id: activeProjectId, status: 'ARCHIVED' });
  });
});
