import { describe, expect, it } from 'vitest';
import { projectListResponseSchema, projectResponseEnvelopeSchema, projectSchema } from './project-schemas';

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

describe('project resource schema', () => {
  it('accepts an active project returned by the API', () => {
    expect(projectSchema.parse(project)).toEqual(project);
  });

  it('accepts an archived project with masked environment metadata', () => {
    const archived = {
      ...project,
      nodeVersion: '22',
      environmentMetadata: { DATABASE_URL: 'configured' },
      status: 'ARCHIVED' as const,
      archivedAt: '2026-02-01T00:00:00.000Z',
    };

    expect(projectSchema.parse(archived)).toEqual(archived);
  });

  it('rejects non database UUID identifiers', () => {
    expect(() => projectSchema.parse({ ...project, id: 'project-id' })).toThrow();
    expect(() => projectSchema.parse({ ...project, organizationId: 'organization-id' })).toThrow();
  });

  it('rejects an unknown status', () => {
    expect(() => projectSchema.parse({ ...project, status: 'DELETED' })).toThrow();
  });

  it('accepts the masked environment metadata value the API returns', () => {
    expect(
      projectSchema.parse({
        ...project,
        environmentMetadata: { DATABASE_URL: 'configured' },
      }),
    ).toMatchObject({ environmentMetadata: { DATABASE_URL: 'configured' } });
  });

  it('rejects an unmasked environment metadata value', () => {
    expect(() =>
      projectSchema.parse({
        ...project,
        environmentMetadata: { API_KEY: 'sk-live-secret' },
      }),
    ).toThrow();
  });

  it('rejects non-string environment metadata entries', () => {
    expect(() =>
      projectSchema.parse({
        ...project,
        environmentMetadata: { API_KEY: 1 },
      }),
    ).toThrow();
  });

  it('rejects a truncated resource', () => {
    const truncated: Record<string, unknown> = { ...project };
    delete truncated.archivedAt;

    expect(() => projectSchema.parse(truncated)).toThrow();
  });
});

describe('project response envelope schemas', () => {
  it('requires the list payload under data', () => {
    expect(projectListResponseSchema.parse({ data: [project] })).toEqual({
      data: [project],
    });
    expect(() => projectListResponseSchema.parse(project)).toThrow();
    expect(() => projectListResponseSchema.parse({ data: project })).toThrow();
  });

  it('requires the project under the mutation envelope', () => {
    expect(projectResponseEnvelopeSchema.parse({ data: { project } })).toEqual({ data: { project } });
    expect(() => projectResponseEnvelopeSchema.parse({ project })).toThrow();
    expect(() => projectResponseEnvelopeSchema.parse({ data: { project: null } })).toThrow();
  });
});
