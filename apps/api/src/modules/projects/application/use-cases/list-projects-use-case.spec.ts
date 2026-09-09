import { describe, expect, it, vi } from 'vitest';
import { ListProjectsUseCase } from './list-projects-use-case.js';

describe('ListProjectsUseCase', () => {
  it('lists projects owned by the user', async () => {
    const projects = { findByOwnerId: vi.fn(async () => [{ id: 'project-id' }]) };
    const useCase = new ListProjectsUseCase(projects as never);

    await expect(useCase.execute('owner-id')).resolves.toEqual([{ id: 'project-id' }]);
    expect(projects.findByOwnerId).toHaveBeenCalledWith('owner-id');
  });
});
