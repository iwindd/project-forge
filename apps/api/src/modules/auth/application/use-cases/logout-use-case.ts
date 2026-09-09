import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { TOKEN_HASHER } from '../ports/auth.ports.js';
import type { TokenHasherPort } from '../ports/auth.ports.js';
import { SESSION_REPOSITORY } from '../ports/session.repository.js';
import type { SessionRepository } from '../ports/session.repository.js';

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
