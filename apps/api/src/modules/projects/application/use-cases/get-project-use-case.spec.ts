import { describe, expect, it, vi } from 'vitest';
import { GetProjectUseCase } from './get-project-use-case.js';

describe('GetProjectUseCase', () => {
  it('enforces owner scoping when reading a project', async () => {
    const projects = { findByOwnerAndId: vi.fn(async () => null) };
    const useCase = new GetProjectUseCase(projects as never);

    await expect(useCase.execute('owner-id', 'project-id')).rejects.toThrow('Project was not found');
    expect(projects.findByOwnerAndId).toHaveBeenCalledWith('owner-id', 'project-id');
  });
});
