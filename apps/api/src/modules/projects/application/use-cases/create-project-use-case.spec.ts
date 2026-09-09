import { describe, expect, it, vi } from 'vitest';
import { ProjectStatus } from '../../domain/project.js';
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

describe('CreateProjectUseCase', () => {
  it('normalizes a GitHub URL and masks environment values', async () => {
    const projects = { save: vi.fn(async () => undefined) };
    const members = { create: vi.fn(async () => undefined) };
    const audit = { record: vi.fn(async () => undefined) };
    const useCase = new CreateProjectUseCase(
      projects as never,
      members as never,
      audit as never,
      unitOfWork() as never,
    );

    const project = await useCase.execute('owner-id', input);

    expect(project.githubUrl).toBe('https://github.com/acme/demo');
    expect(project.name).toBe('demo');
    expect(project.environmentMetadata).toEqual({ DATABASE_URL: 'configured' });
    expect(project.status).toBe(ProjectStatus.ACTIVE);
    expect(members.create).toHaveBeenCalledOnce();
    expect(audit.record).toHaveBeenCalledOnce();
  });

  it('rejects unsupported and credential-bearing repository URLs', async () => {
    const projects = { save: vi.fn() };
    const useCase = new CreateProjectUseCase(
      projects as never,
      { create: vi.fn() } as never,
      { record: vi.fn() } as never,
      unitOfWork() as never,
    );

    await expect(
      useCase.execute('owner-id', { ...input, githubUrl: 'https://git.example.com/acme/demo' }),
    ).rejects.toThrow('Only GitHub HTTPS repository URLs are supported');
    await expect(
      useCase.execute('owner-id', { ...input, githubUrl: 'https://user:secret@github.com/acme/demo' }),
    ).rejects.toThrow('Only GitHub HTTPS repository URLs are supported');
    expect(projects.save).not.toHaveBeenCalled();
  });
});
