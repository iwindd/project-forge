import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../../common/auth/admin.guard.js';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import {
  ChangeUserRoleUseCase,
  ChangeUserStatusUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  RevokeUserSessionsUseCase,
} from '../application/use-cases/user.use-cases.js';
import { changeUserRoleSchema, changeUserStatusSchema } from './dto/user.schemas.js';

@Controller('admin/users')
@UseGuards(SessionGuard, AdminGuard)
export class UsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly changeStatus: ChangeUserStatusUseCase,
    private readonly changeRole: ChangeUserRoleUseCase,
    private readonly revokeSessions: RevokeUserSessionsUseCase,
  ) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listUsers.execute({ search, status, page: Number(page) || 1, limit: Number(limit) || 25 });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return { user: await this.getUser.execute(id) };
  }

  @Patch(':id/status')
  async setStatus(@Param('id') id: string, @Body() body: unknown, @Principal() actor: AuthenticatedPrincipal) {
    return { user: await this.changeStatus.execute(actor.id, id, changeUserStatusSchema.parse(body)) };
  }

  @Patch(':id/role')
  async setRole(@Param('id') id: string, @Body() body: unknown, @Principal() actor: AuthenticatedPrincipal) {
    return { user: await this.changeRole.execute(actor.id, id, changeUserRoleSchema.parse(body)) };
  }

  @Post(':id/revoke-sessions')
  revoke(@Param('id') id: string, @Principal() actor: AuthenticatedPrincipal) {
    return this.revokeSessions.execute(actor.id, id);
  }
}
