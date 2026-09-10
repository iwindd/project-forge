import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../../common/auth/admin.guard.js';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { apiSuccess } from '../../../common/http/api-response.js';
import { GetMyAccessRequestsUseCase } from '../application/use-cases/get-my-access-requests-use-case.js';
import { ListAccessRequestsUseCase } from '../application/use-cases/list-access-requests-use-case.js';
import { RequestAccessUseCase } from '../application/use-cases/request-access-use-case.js';
import { ReviewAccessRequestUseCase } from '../application/use-cases/review-access-request-use-case.js';
import {
  accessRequestIdParamSchema,
  requestAccessSchema,
  reviewAccessRequestSchema,
} from './dto/access-request.schemas.js';
import {
  accessRequestAdminListResponseSchema,
  accessRequestListResponseSchema,
  accessRequestResponseEnvelopeSchema,
  accessRequestReviewResponseSchema,
} from './dto/access-request-response.schemas.js';

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
    const requests = await this.getMine.execute(principal.id);
    return accessRequestListResponseSchema.parse(
      apiSuccess(requests.map(serializeAccessRequest)),
    );
  }

  @Post()
  async request(@Principal() principal: AuthenticatedPrincipal, @Body() body: unknown) {
    const request = await this.requestAccess.execute(
      principal.id,
      requestAccessSchema.parse(body),
    );
    return accessRequestResponseEnvelopeSchema.parse(
      apiSuccess({ request: serializeAccessRequest(request) }),
    );
  }

  @Get()
  @UseGuards(AdminGuard)
  async list() {
    const rows = await this.listAccessRequests.execute();
    return accessRequestAdminListResponseSchema.parse(
      apiSuccess(
        rows.map(({ request, user }) => ({
          ...serializeAccessRequest(request),
          user: user ? serializeUser(user) : null,
        })),
      ),
    );
  }

  @Post(':id/approve')
  @UseGuards(AdminGuard)
  async approve(@Param() rawParams: unknown, @Principal() principal: AuthenticatedPrincipal, @Body() body: unknown) {
    const { id } = accessRequestIdParamSchema.parse(rawParams);
    const result = await this.reviewAccessRequest.execute(
      principal.id,
      id,
      'approve',
      reviewAccessRequestSchema.parse(body ?? {}).note,
    );
    return accessRequestReviewResponseSchema.parse(
      apiSuccess({
        request: serializeAccessRequest(result.request),
        user: serializeUser(result.user),
      }),
    );
  }

  @Post(':id/reject')
  @UseGuards(AdminGuard)
  async reject(@Param() rawParams: unknown, @Principal() principal: AuthenticatedPrincipal, @Body() body: unknown) {
    const { id } = accessRequestIdParamSchema.parse(rawParams);
    const result = await this.reviewAccessRequest.execute(
      principal.id,
      id,
      'reject',
      reviewAccessRequestSchema.parse(body ?? {}).note,
    );
    return accessRequestReviewResponseSchema.parse(
      apiSuccess({
        request: serializeAccessRequest(result.request),
        user: serializeUser(result.user),
      }),
    );
  }
}

function serializeAccessRequest(request: Awaited<ReturnType<GetMyAccessRequestsUseCase['execute']>>[number]) {
  return {
    ...request,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

function serializeUser(user: NonNullable<Awaited<ReturnType<ListAccessRequestsUseCase['execute']>>[number]['user']>) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
