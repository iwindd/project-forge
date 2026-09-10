import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApprovedGuard } from '../../../common/auth/approved.guard.js';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import { apiSuccess } from '../../../common/http/api-response.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { ArchiveProjectUseCase } from '../application/use-cases/archive-project-use-case.js';
import { CreateProjectUseCase } from '../application/use-cases/create-project-use-case.js';
import { GetProjectUseCase } from '../application/use-cases/get-project-use-case.js';
import { ListProjectsUseCase } from '../application/use-cases/list-projects-use-case.js';
import { UpdateProjectUseCase } from '../application/use-cases/update-project-use-case.js';
import {
  createProjectSchema,
  projectIdParamSchema,
  updateProjectSchema,
} from './dto/project.schemas.js';
import {
  projectListResponseSchema,
  projectResponseEnvelopeSchema,
} from './dto/project-response.schemas.js';

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
    const projects = await this.listProjects.execute(principal.id);
    return projectListResponseSchema.parse(
      apiSuccess(projects.map(serializeProject)),
    );
  }

  @Post()
  async create(@Principal() principal: AuthenticatedPrincipal, @Body() body: unknown) {
    const project = await this.createProject.execute(
      principal.id,
      createProjectSchema.parse(body),
    );
    return projectResponseEnvelopeSchema.parse(
      apiSuccess({ project: serializeProject(project) }),
    );
  }

  @Get(':id')
  async get(@Principal() principal: AuthenticatedPrincipal, @Param() rawParams: unknown) {
    const { id } = projectIdParamSchema.parse(rawParams);
    const project = await this.getProject.execute(principal.id, id);
    return projectResponseEnvelopeSchema.parse(
      apiSuccess({ project: serializeProject(project) }),
    );
  }

  @Patch(':id')
  async update(@Principal() principal: AuthenticatedPrincipal, @Param() rawParams: unknown, @Body() body: unknown) {
    const { id } = projectIdParamSchema.parse(rawParams);
    const project = await this.updateProject.execute(
      principal.id,
      id,
      updateProjectSchema.parse(body),
    );
    return projectResponseEnvelopeSchema.parse(
      apiSuccess({ project: serializeProject(project) }),
    );
  }

  @Post(':id/archive')
  async archive(@Principal() principal: AuthenticatedPrincipal, @Param() rawParams: unknown) {
    const { id } = projectIdParamSchema.parse(rawParams);
    const project = await this.archiveProject.execute(principal.id, id);
    return projectResponseEnvelopeSchema.parse(
      apiSuccess({ project: serializeProject(project) }),
    );
  }
}

function serializeProject(project: Awaited<ReturnType<ListProjectsUseCase['execute']>>[number]) {
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    archivedAt: project.archivedAt?.toISOString() ?? null,
  };
}
