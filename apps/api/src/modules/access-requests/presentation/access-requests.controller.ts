import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../../common/auth/admin.guard.js';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { GetMyAccessRequestsUseCase } from '../application/use-cases/get-my-access-requests-use-case.js';
import { ListAccessRequestsUseCase } from '../application/use-cases/list-access-requests-use-case.js';
import { RequestAccessUseCase } from '../application/use-cases/request-access-use-case.js';
import { ReviewAccessRequestUseCase } from '../application/use-cases/review-access-request-use-case.js';
import { requestAccessSchema, reviewAccessRequestSchema } from './dto/access-request.schemas.js';

@Controller('access-requests')
@UseGuards(SessionGuard)
export class AccessRequestsController {
  constructor(
    private readonly getMine: GetMyAccessRequestsUseCase,
    private readonly requestAccess: RequestAccessUseCase,
    private readonly listAccessRequests: ListAccessRequestsUseCase,
    private readonly reviewAccessRequest: ReviewAccessRequestUseCase,
  ) {}

  @Get('me')
  async getMyRequests(@Principal() principal: AuthenticatedPrincipal) {
    return { requests: await this.getMine.execute(principal.id) };
  }

  @Post()
  async request(@Principal() principal: AuthenticatedPrincipal, @Body() body: unknown) {
    return { request: await this.requestAccess.execute(principal.id, requestAccessSchema.parse(body)) };
  }

  @Get()
  @UseGuards(AdminGuard)
  async list() {
    const rows = await this.listAccessRequests.execute();
    return { requests: rows.map(({ request, user }) => ({ ...request, user })) };
  }

  @Post(':id/approve')
  @UseGuards(AdminGuard)
  async approve(@Param('id') id: string, @Principal() principal: AuthenticatedPrincipal, @Body() body: unknown) {
    return this.reviewAccessRequest.execute(
      principal.id,
      id,
      'approve',
      reviewAccessRequestSchema.parse(body ?? {}).note,
    );
  }

  @Post(':id/reject')
  @UseGuards(AdminGuard)
  async reject(@Param('id') id: string, @Principal() principal: AuthenticatedPrincipal, @Body() body: unknown) {
    return this.reviewAccessRequest.execute(
      principal.id,
      id,
      'reject',
      reviewAccessRequestSchema.parse(body ?? {}).note,
    );
  }
}
