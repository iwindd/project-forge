import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal, SessionAuthenticator } from '../../../../common/auth/auth.types.js';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { USER_REPOSITORY } from '../../../users/application/ports/user.repository.js';
import type { UserRepository } from '../../../users/application/ports/user.repository.js';
import { toPrincipal } from '../auth.mappers.js';
import { TOKEN_HASHER } from '../ports/auth.ports.js';
import type { TokenHasherPort } from '../ports/auth.ports.js';
import { SESSION_REPOSITORY } from '../ports/session.repository.js';
import type { SessionRepository } from '../ports/session.repository.js';

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
