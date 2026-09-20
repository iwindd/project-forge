import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import { AdminGuard } from '../../../common/auth/admin.guard.js';
import { Principal } from '../../../common/auth/principal.decorator.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { apiSuccess } from '../../../common/http/api-response.js';
import { getRequestId } from '../../../common/http/request-context.js';
import { UserRole } from '../../users/domain/user.js';
import {
  CreateSharedAgentUseCase,
  createSharedAgentInputSchema,
} from '../application/use-cases/create-shared-agent-use-case.js';
import { GetSharedAgentOptionsUseCase } from '../application/use-cases/get-shared-agent-options-use-case.js';
import { ListSharedAgentsUseCase } from '../application/use-cases/list-shared-agents-use-case.js';
import {
  sharedAgentCreationResponseEnvelopeSchema,
  sharedAgentOptionsResponseEnvelopeSchema,
  sharedAgentRosterResponseEnvelopeSchema,
} from './dto/hermes-agents-response.schemas.js';

@Controller('hermes/agents')
@UseGuards(SessionGuard)
export class HermesAgentsController {
  constructor(
    private readonly listSharedAgents: ListSharedAgentsUseCase,
    private readonly getSharedAgentOptions: GetSharedAgentOptionsUseCase,
    private readonly createSharedAgent: CreateSharedAgentUseCase,
  ) {}

  @Get()
  async list(@Principal() principal: AuthenticatedPrincipal) {
    const roster = await this.listSharedAgents.execute({ canConfigure: principal.role === UserRole.ADMIN });
    return sharedAgentRosterResponseEnvelopeSchema.parse(apiSuccess(roster));
  }

  @Get('options')
  @UseGuards(AdminGuard)
  async options() {
    return sharedAgentOptionsResponseEnvelopeSchema.parse(apiSuccess(await this.getSharedAgentOptions.execute()));
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  async create(@Body() rawBody: unknown, @Principal() principal: AuthenticatedPrincipal, @Req() request: Request) {
    const result = await this.createSharedAgent.execute({
      input: createSharedAgentInputSchema.parse(rawBody),
      actorId: principal.id,
      requestId: getRequestId(request),
    });
    return sharedAgentCreationResponseEnvelopeSchema.parse(apiSuccess(result));
  }
}
