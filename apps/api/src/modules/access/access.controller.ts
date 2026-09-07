import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApprovedGuard } from '../../common/auth/approved.guard.js';
import { AdminGuard } from '../../common/auth/admin.guard.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { Principal } from '../../common/auth/principal.decorator.js';
import type { AuthenticatedPrincipal } from '../../common/auth/auth.types.js';
import { AccessService } from './access.service.js';

@Controller('access-requests')
@UseGuards(SessionGuard)
export class AccessController {
  constructor(private readonly access: AccessService) {}

  @Get('me')
  async getMine(@Principal() principal: AuthenticatedPrincipal) {
    return { requests: await this.access.getMine(principal.id) };
  }

  @Post()
  async request(@Principal() principal: AuthenticatedPrincipal, @Body() body: unknown) {
    return { request: await this.access.request(principal.id, body) };
  }

  @Get()
  @UseGuards(AdminGuard)
  async list() {
    return { requests: await this.access.list() };
  }

  @Post(':id/approve')
  @UseGuards(AdminGuard)
  async approve(@Param('id') id: string, @Principal() principal: AuthenticatedPrincipal, @Body() body: { note?: string }) {
    return this.access.approve(principal.id, id, body?.note);
  }

  @Post(':id/reject')
  @UseGuards(AdminGuard)
  async reject(@Param('id') id: string, @Principal() principal: AuthenticatedPrincipal, @Body() body: { note?: string }) {
    return this.access.reject(principal.id, id, body?.note);
  }
}
