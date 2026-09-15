import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { apiSuccess } from '../../../common/http/api-response.js';
import { ListGithubIssuesUseCase } from '../application/use-cases/list-github-issues-use-case.js';
import { githubIssueListResponseSchema } from './dto/github-issue-response.schemas.js';

const listIssuesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(25),
});

@Controller('issues')
@UseGuards(SessionGuard)
export class IssuesController {
  constructor(@Inject(ListGithubIssuesUseCase) private readonly listIssues: ListGithubIssuesUseCase) {}

  @Get()
  async list(@Principal() principal: AuthenticatedPrincipal, @Query() rawQuery: unknown) {
    const query = listIssuesQuerySchema.parse(rawQuery);
    const result = await this.listIssues.execute({ userId: principal.id, ...query });
    return apiSuccess(
      githubIssueListResponseSchema.parse({
        data: result.issues,
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          hasNext: result.hasNext,
        },
      }),
    );
  }
}
