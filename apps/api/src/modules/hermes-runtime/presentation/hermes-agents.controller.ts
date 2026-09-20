import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import { Principal } from '../../../common/auth/principal.decorator.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { apiSuccess } from '../../../common/http/api-response.js';
import { UserRole } from '../../users/domain/user.js';
import { ListSharedAgentsUseCase } from '../application/use-cases/list-shared-agents-use-case.js';
import { sharedAgentRosterResponseEnvelopeSchema } from './dto/hermes-agents-response.schemas.js';

@Controller('hermes/agents')
@UseGuards(SessionGuard)
export class HermesAgentsController {
  constructor(private readonly listSharedAgents: ListSharedAgentsUseCase) {}

  @Get()
  async list(@Principal() principal: AuthenticatedPrincipal) {
    const roster = await this.listSharedAgents.execute({ canConfigure: principal.role === UserRole.ADMIN });
    return sharedAgentRosterResponseEnvelopeSchema.parse(apiSuccess(roster));
  }
}
