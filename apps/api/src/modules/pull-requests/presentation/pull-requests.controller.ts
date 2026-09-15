import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Principal } from '../../../common/auth/principal.decorator.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import { apiSuccess } from '../../../common/http/api-response.js';
import { ListConnectedPullRequestsUseCase } from '../application/use-cases/list-connected-pull-requests-use-case.js';
import { pullRequestListQuerySchema, pullRequestListResponseSchema } from './dto/pull-request.schemas.js';

@Controller('pull-requests')
@UseGuards(SessionGuard)
export class PullRequestsController {
  constructor(private readonly listPullRequests: ListConnectedPullRequestsUseCase) {}

  @Get()
  async list(@Principal() principal: AuthenticatedPrincipal, @Query() query: unknown) {
    const result = await this.listPullRequests.execute(principal.id, ...Object.values(pullRequestListQuerySchema.parse(query)) as [number, number]);
    return pullRequestListResponseSchema.parse(apiSuccess(result));
  }
}