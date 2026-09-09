import { describe, expect, it } from 'vitest';
import { CompleteGithubLoginUseCase } from './complete-github-login-use-case.js';

describe('CompleteGithubLoginUseCase', () => {
  it('rejects an empty OAuth code before calling external services', async () => {
    const useCase = new CompleteGithubLoginUseCase(
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    );

    await expect(useCase.execute('')).rejects.toThrow('OAuth code is required');
  });
});
