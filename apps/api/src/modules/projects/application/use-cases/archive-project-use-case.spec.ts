import { describe, expect, it, vi } from 'vitest';
import { ProjectStatus } from '../../domain/project.js';
import { ArchiveProjectUseCase } from './archive-project-use-case.js';

describe('ArchiveProjectUseCase', () => {
  it('archives the owner project and writes an audit record', async () => {
    const project = {
      id: 'project-id',
      status: ProjectStatus.ACTIVE,
      archivedAt: null,
      updatedAt: new Date(),
    };
    const projects = {
      findByOwnerAndId: vi.fn(async () => project),
      save: vi.fn(async () => undefined),
    };
    const audit = { record: vi.fn(async () => undefined) };
    const unitOfWork = { run: vi.fn(async <T>(work: () => Promise<T>) => work()) };
    const useCase = new ArchiveProjectUseCase(projects as never, audit as never, unitOfWork as never);

    const result = await useCase.execute('owner-id', 'project-id');

    expect(result.status).toBe(ProjectStatus.ARCHIVED);
    expect(projects.save).toHaveBeenCalledOnce();
    expect(audit.record).toHaveBeenCalledOnce();
  });
});
