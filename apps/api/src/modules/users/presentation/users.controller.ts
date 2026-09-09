import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../../common/auth/admin.guard.js';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { ChangeUserNameUseCase } from '../application/use-cases/change-user-name-use-case.js';
import { ChangeUserRoleUseCase } from '../application/use-cases/change-user-role-use-case.js';
import { ChangeUserStatusUseCase } from '../application/use-cases/change-user-status-use-case.js';
import { GetUserUseCase } from '../application/use-cases/get-user-use-case.js';
import { ListUsersUseCase } from '../application/use-cases/list-users-use-case.js';
import { RevokeUserSessionsUseCase } from '../application/use-cases/revoke-user-sessions-use-case.js';
import { changeUserNameSchema, changeUserRoleSchema, changeUserStatusSchema } from './dto/user.schemas.js';

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
  list(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listUsers.execute({ search, status, role: role === 'EDITOR' ? 'USER' : role, page: Number(page) || 1, limit: Number(limit) || 25 }).then((result) => ({
      ...result,
      data: result.data.map((user) => this.present(user)),
    }));
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return { user: this.present(await this.getUser.execute(id)) };
  }

  @Patch(':id/name')
  async setName(@Param('id') id: string, @Body() body: unknown, @Principal() actor: AuthenticatedPrincipal) {
    return { user: this.present(await this.changeName.execute(actor.id, id, changeUserNameSchema.parse(body))) };
  }

  @Patch(':id/status')
  async setStatus(@Param('id') id: string, @Body() body: unknown, @Principal() actor: AuthenticatedPrincipal) {
    return { user: this.present(await this.changeStatus.execute(actor.id, id, changeUserStatusSchema.parse(body))) };
  }

  @Patch(':id/role')
  async setRole(@Param('id') id: string, @Body() body: unknown, @Principal() actor: AuthenticatedPrincipal) {
    return { user: this.present(await this.changeRole.execute(actor.id, id, changeUserRoleSchema.parse(body))) };
  }

  @Post(':id/revoke-sessions')
  revoke(@Param('id') id: string, @Principal() actor: AuthenticatedPrincipal) {
    return this.revokeSessions.execute(actor.id, id);
  }
}
