import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { SESSION_REPOSITORY } from '../ports/session.repository.js';
import type { SessionRepository } from '../ports/session.repository.js';
import { AUTH_CONFIG, TOKEN_GENERATOR, TOKEN_HASHER } from '../ports/auth.ports.js';
import type { AuthConfig, TokenGeneratorPort, TokenHasherPort } from '../ports/auth.ports.js';
import { createSession } from '../../domain/session.js';
import type { AuthenticatedPrincipal, SessionAuthenticator } from '../../../../common/auth/auth.types.js';
import { USER_REPOSITORY } from '../../../users/application/ports/user.repository.js';
import type { UserRepository } from '../../../users/application/ports/user.repository.js';
import { toPrincipal } from '../auth.mappers.js';

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
    return this.sessions
      .create(session)
      .then(() => token);
  }
}

@Injectable()
export class AuthenticateSessionUseCase implements SessionAuthenticator {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(TOKEN_HASHER) private readonly hasher: TokenHasherPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  async principalFromToken(token: string | undefined): Promise<AuthenticatedPrincipal | null> {
    if (!token) return null;
    return this.unitOfWork.run(async () => {
      const session = await this.sessions.findActiveByTokenHash(this.hasher.hash(token));
      if (!session || session.expiresAt.getTime() <= Date.now()) return null;
      const user = await this.users.findById(session.userId);
      if (!user?.isActive) return null;
      session.lastSeenAt = new Date();
      await this.sessions.save(session);
      return { ...toPrincipal(user), activeOrganizationId: session.activeOrganizationId };
    });
  }
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(TOKEN_HASHER) private readonly hasher: TokenHasherPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.unitOfWork.run(() => this.sessions.revokeByTokenHash(this.hasher.hash(token)));
  }
}
