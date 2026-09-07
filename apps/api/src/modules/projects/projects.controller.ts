import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApprovedGuard } from '../../common/auth/approved.guard.js';
import { Principal } from '../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import type { AuthenticatedPrincipal } from '../../common/auth/auth.types.js';
import { ProjectsService } from './projects.service.js';

@Controller('projects')
@UseGuards(SessionGuard, ApprovedGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  async list(@Principal() principal: AuthenticatedPrincipal) {
    return { projects: await this.projects.list(principal.id) };
  }

  @Post()
  async create(@Principal() principal: AuthenticatedPrincipal, @Body() body: unknown) {
    return { project: await this.projects.create(principal.id, body) };
  }

  @Get(':id')
  async get(@Principal() principal: AuthenticatedPrincipal, @Param('id') id: string) {
    return { project: await this.projects.get(principal.id, id) };
  }

  @Patch(':id')
  async update(@Principal() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() body: unknown) {
    return { project: await this.projects.update(principal.id, id, body) };
  }

  @Post(':id/archive')
  async archive(@Principal() principal: AuthenticatedPrincipal, @Param('id') id: string) {
    return { project: await this.projects.archive(principal.id, id) };
  }
}
