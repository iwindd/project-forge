import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApprovedGuard } from '../../../common/auth/approved.guard.js';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { ArchiveProjectUseCase } from '../application/use-cases/archive-project-use-case.js';
import { CreateProjectUseCase } from '../application/use-cases/create-project-use-case.js';
import { GetProjectUseCase } from '../application/use-cases/get-project-use-case.js';
import { ListProjectsUseCase } from '../application/use-cases/list-projects-use-case.js';
import { UpdateProjectUseCase } from '../application/use-cases/update-project-use-case.js';
import { createProjectSchema, updateProjectSchema } from './dto/project.schemas.js';

@Controller('projects')
@UseGuards(SessionGuard, ApprovedGuard)
export class ProjectsController {
  constructor(
    private readonly listProjects: ListProjectsUseCase,
    private readonly createProject: CreateProjectUseCase,
    private readonly getProject: GetProjectUseCase,
    private readonly updateProject: UpdateProjectUseCase,
    private readonly archiveProject: ArchiveProjectUseCase,
  ) {}

  @Get()
  async list(@Principal() principal: AuthenticatedPrincipal) {
    return { projects: await this.listProjects.execute(principal.id) };
  }

  @Post()
  async create(@Principal() principal: AuthenticatedPrincipal, @Body() body: unknown) {
    return { project: await this.createProject.execute(principal.id, createProjectSchema.parse(body)) };
  }

  @Get(':id')
  async get(@Principal() principal: AuthenticatedPrincipal, @Param('id') id: string) {
    return { project: await this.getProject.execute(principal.id, id) };
  }

  @Patch(':id')
  async update(@Principal() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() body: unknown) {
    return { project: await this.updateProject.execute(principal.id, id, updateProjectSchema.parse(body)) };
  }

  @Post(':id/archive')
  async archive(@Principal() principal: AuthenticatedPrincipal, @Param('id') id: string) {
    return { project: await this.archiveProject.execute(principal.id, id) };
  }
}
