import { describe, expect, it, vi } from 'vitest';
import { StartGithubLoginUseCase } from './start-github-login-use-case.js';

describe('StartGithubLoginUseCase', () => {
  it('creates a state token and delegates URL construction to the GitHub adapter', () => {
    const github = { authorizationUrl: vi.fn((state: string) => `https://github.com/login?state=${state}`) };
    const tokens = { hex: vi.fn(() => 'state-token') };
    const useCase = new StartGithubLoginUseCase(github as never, tokens as never);

    expect(useCase.execute()).toEqual({
      state: 'state-token',
      url: 'https://github.com/login?state=state-token',
    });
    expect(tokens.hex).toHaveBeenCalledWith(32);
  });
});
