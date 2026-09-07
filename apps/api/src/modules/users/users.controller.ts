import { Controller, Get, Param, Patch, Post, Query, Body, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/auth/admin.guard.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { Principal } from '../../common/auth/principal.decorator.js';
import type { AuthenticatedPrincipal } from '../../common/auth/auth.types.js';
import { UsersService } from './users.service.js';

@Controller('admin/users')
@UseGuards(SessionGuard, AdminGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query('search') search?: string, @Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.users.list({ search, status, page: Number(page) || 1, limit: Number(limit) || 25 });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return { user: await this.users.get(id) };
  }

  @Patch(':id/status')
  async setStatus(@Param('id') id: string, @Body() body: unknown, @Principal() actor: AuthenticatedPrincipal) {
    return { user: await this.users.setStatus(actor.id, id, body) };
  }

  @Patch(':id/role')
  async setRole(@Param('id') id: string, @Body() body: unknown, @Principal() actor: AuthenticatedPrincipal) {
    return { user: await this.users.setRole(actor.id, id, body) };
  }

  @Post(':id/revoke-sessions')
  revoke(@Param('id') id: string, @Principal() actor: AuthenticatedPrincipal) {
    return this.users.revokeSessions(actor.id, id);
  }
}
