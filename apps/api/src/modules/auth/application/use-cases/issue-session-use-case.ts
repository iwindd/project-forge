import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { createSession } from '../../domain/session.js';
import { AUTH_CONFIG, TOKEN_GENERATOR, TOKEN_HASHER } from '../ports/auth.ports.js';
import type { AuthConfig, TokenGeneratorPort, TokenHasherPort } from '../ports/auth.ports.js';
import { SESSION_REPOSITORY } from '../ports/session.repository.js';
import type { SessionRepository } from '../ports/session.repository.js';

@Injectable()
export class IssueSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGeneratorPort,
    @Inject(TOKEN_HASHER) private readonly hasher: TokenHasherPort,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(userId: string, activeOrganizationId?: string | null): Promise<string> {
    return this.unitOfWork.run(() => this.issueWithinTransaction(userId, activeOrganizationId));
  }

  issueWithinTransaction(userId: string, activeOrganizationId?: string | null): Promise<string> {
    const token = this.tokens.base64Url(32);
    const expiresAt = new Date(Date.now() + this.config.sessionTtlSeconds * 1000);
    const session = createSession({ userId, tokenHash: this.hasher.hash(token), expiresAt });
    session.activeOrganizationId = activeOrganizationId ?? null;
    return this.sessions.create(session).then(() => token);
  }
}
