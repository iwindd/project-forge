import { describe, expect, it, vi } from 'vitest';
import { ProjectsService } from './projects.service.js';

describe('ProjectsService', () => {
  it('normalizes a GitHub URL and never stores environment values', async () => {
    const em = {
      create: vi.fn((_entity, input) => ({ id: 'project-id', status: 'ACTIVE', ...input })),
      persist: vi.fn(),
      flush: vi.fn(async () => undefined),
    };
    const auth = { writeAudit: vi.fn(async () => undefined) };
    const service = new ProjectsService(em as never, auth as never);

    const project = await service.create('owner-id', {
      githubUrl: 'https://github.com/acme/demo.git',
      environmentMetadata: { DATABASE_URL: 'do-not-store-this' },
    });

    expect(project.githubUrl).toBe('https://github.com/acme/demo');
    expect(project.name).toBe('demo');
    expect(project.environmentMetadata).toEqual({ DATABASE_URL: 'configured' });
    expect(auth.writeAudit).toHaveBeenCalledOnce();
  });

  it('rejects non-GitHub or credential-bearing repository URLs', async () => {
    const em = { create: vi.fn(), persist: vi.fn(), flush: vi.fn() };
    const auth = { writeAudit: vi.fn() };
    const service = new ProjectsService(em as never, auth as never);

    await expect(service.create('owner-id', { githubUrl: 'https://git.example.com/acme/demo' })).rejects.toThrow(
      'Only GitHub HTTPS repository URLs are supported',
    );
    await expect(service.create('owner-id', { githubUrl: 'https://user:secret@github.com/acme/demo' })).rejects.toThrow(
      'Only GitHub HTTPS repository URLs are supported',
    );
    expect(em.create).not.toHaveBeenCalled();
  });
});
