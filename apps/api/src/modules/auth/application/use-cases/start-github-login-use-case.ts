import { Inject, Injectable } from '@nestjs/common';
import { GITHUB_OAUTH, TOKEN_GENERATOR } from '../ports/auth.ports.js';
import type { GithubOAuthPort, TokenGeneratorPort } from '../ports/auth.ports.js';

@Injectable()
export class StartGithubLoginUseCase {
  constructor(
    @Inject(GITHUB_OAUTH) private readonly github: GithubOAuthPort,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGeneratorPort,
  ) {}

  execute(): { url: string; state: string } {
    const state = this.tokens.hex(32);
    return { state, url: this.github.authorizationUrl(state) };
  }
}
