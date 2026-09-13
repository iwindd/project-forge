import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { apiSuccess } from '../../../common/http/api-response.js';
import { AdminGuard } from '../../../common/auth/admin.guard.js';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { AccessStatus, UserRole } from '../domain/user.js';
import { ChangeUserNameUseCase } from '../application/use-cases/change-user-name-use-case.js';
import { ChangeUserRoleUseCase } from '../application/use-cases/change-user-role-use-case.js';
import { ChangeUserStatusUseCase } from '../application/use-cases/change-user-status-use-case.js';
import { GetUserUseCase } from '../application/use-cases/get-user-use-case.js';
import { ListUsersUseCase } from '../application/use-cases/list-users-use-case.js';
import { RevokeUserSessionsUseCase } from '../application/use-cases/revoke-user-sessions-use-case.js';
import {
  changeUserNameSchema,
  changeUserRoleSchema,
  changeUserStatusSchema,
  userIdParamSchema,
  userListQuerySchema,
} from './dto/user.schemas.js';
import {
  userListResponseSchema,
  userMutationResponseSchema,
  userResponseEnvelopeSchema,
} from './dto/user-response.schemas.js';

@Controller('admin/users')
@UseGuards(SessionGuard, AdminGuard)
export class UsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly changeStatus: ChangeUserStatusUseCase,
    private readonly changeRole: ChangeUserRoleUseCase,
    private readonly changeName: ChangeUserNameUseCase,
    private readonly revokeSessions: RevokeUserSessionsUseCase,
  ) {}

  private present(user: Awaited<ReturnType<GetUserUseCase['execute']>>) {
    return {
      id: user.id,
      name: user.name ?? user.githubLogin,
      email: user.githubLogin,
      role: user.role === 'ADMIN' ? 'ADMIN' : 'EDITOR',
      isActive: user.isActive && user.accessStatus !== 'SUSPENDED',
      accessStatus: user.accessStatus,
      githubLogin: user.githubLogin,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  @Get()
  async list(@Query() rawQuery: unknown) {
    const query = userListQuerySchema.parse(rawQuery);
    const result = await this.listUsers.execute({
      search: query.search,
      status:
        query.status === 'active'
          ? AccessStatus.APPROVED
          : query.status === 'inactive'
            ? AccessStatus.SUSPENDED
            : undefined,
      role: query.role === 'EDITOR' ? UserRole.USER : query.role,
      page: query.page,
      limit: query.pageSize,
    });
    return userListResponseSchema.parse(
      apiSuccess(
        result.data.map((user) => this.present(user)),
        {
          page: result.page,
          pageSize: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      ),
    );
  }

  @Get(':id')
  async get(@Param() rawParams: unknown) {
    const { id } = userIdParamSchema.parse(rawParams);
    return userResponseEnvelopeSchema.parse(apiSuccess({ user: this.present(await this.getUser.execute(id)) }));
  }

  @Patch(':id/name')
  async setName(@Param() rawParams: unknown, @Body() body: unknown, @Principal() actor: AuthenticatedPrincipal) {
    const { id } = userIdParamSchema.parse(rawParams);
    return userResponseEnvelopeSchema.parse(
      apiSuccess({
        user: this.present(await this.changeName.execute(actor.id, id, changeUserNameSchema.parse(body))),
      }),
    );
  }

  @Patch(':id/status')
  async setStatus(@Param() rawParams: unknown, @Body() body: unknown, @Principal() actor: AuthenticatedPrincipal) {
    const { id } = userIdParamSchema.parse(rawParams);
    return userResponseEnvelopeSchema.parse(
      apiSuccess({
        user: this.present(await this.changeStatus.execute(actor.id, id, changeUserStatusSchema.parse(body))),
      }),
    );
  }

  @Patch(':id/role')
  async setRole(@Param() rawParams: unknown, @Body() body: unknown, @Principal() actor: AuthenticatedPrincipal) {
    const { id } = userIdParamSchema.parse(rawParams);
    return userResponseEnvelopeSchema.parse(
      apiSuccess({
        user: this.present(await this.changeRole.execute(actor.id, id, changeUserRoleSchema.parse(body))),
      }),
    );
  }

  @Post(':id/revoke-sessions')
  revoke(@Param() rawParams: unknown, @Principal() actor: AuthenticatedPrincipal) {
    const { id } = userIdParamSchema.parse(rawParams);
    return this.revokeSessions.execute(actor.id, id).then(() => userMutationResponseSchema.parse(apiSuccess(null)));
  }
}
