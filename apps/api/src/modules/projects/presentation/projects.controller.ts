import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import { apiSuccess } from '../../../common/http/api-response.js';
import { getRequestId } from '../../../common/http/request-context.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { ArchiveProjectUseCase } from '../application/use-cases/archive-project-use-case.js';
import { CreateProjectUseCase } from '../application/use-cases/create-project-use-case.js';
import { GetProjectUseCase } from '../application/use-cases/get-project-use-case.js';
import { ListProjectsUseCase } from '../application/use-cases/list-projects-use-case.js';
import { RestoreProjectUseCase } from '../application/use-cases/restore-project-use-case.js';
import { UpdateProjectUseCase } from '../application/use-cases/update-project-use-case.js';
import {
  createProjectSchema,
  optionalProjectReasonSchema,
  organizationIdParamSchema,
  organizationProjectIdParamSchema,
  updateProjectSchema,
} from './dto/project.schemas.js';
import {
  projectListResponseSchema,
  projectResponseEnvelopeSchema,
} from './dto/project-response.schemas.js';

@Controller('organizations/:organizationId/projects')
@UseGuards(SessionGuard)
export class ProjectsController {
  constructor(
    private readonly listProjects: ListProjectsUseCase,
    private readonly createProject: CreateProjectUseCase,
    private readonly getProject: GetProjectUseCase,
    private readonly updateProject: UpdateProjectUseCase,
    private readonly archiveProject: ArchiveProjectUseCase,
    private readonly restoreProject: RestoreProjectUseCase,
  ) {}

  @Get()
  async list(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
  ) {
    const { organizationId } = organizationIdParamSchema.parse(rawParams);
    const projects = await this.listProjects.execute(principal.id, organizationId);
    return projectListResponseSchema.parse(
      apiSuccess(projects.map(serializeProject)),
    );
  }

  @Post()
  async create(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const { organizationId } = organizationIdParamSchema.parse(rawParams);
    const project = await this.createProject.execute(
      principal.id,
      organizationId,
      createProjectSchema.parse(body),
      { requestId: getRequestId(request) },
    );
    return projectResponseEnvelopeSchema.parse(
      apiSuccess({ project: serializeProject(project) }),
    );
  }

  @Get(':id')
  async get(@Principal() principal: AuthenticatedPrincipal, @Param() rawParams: unknown) {
    const { organizationId, id } = organizationProjectIdParamSchema.parse(rawParams);
    const project = await this.getProject.execute(principal.id, organizationId, id);
    return projectResponseEnvelopeSchema.parse(
      apiSuccess({ project: serializeProject(project) }),
    );
  }

  @Patch(':id')
  async update(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const { organizationId, id } = organizationProjectIdParamSchema.parse(rawParams);
    const project = await this.updateProject.execute(
      principal.id,
      organizationId,
      id,
      updateProjectSchema.parse(body),
      { requestId: getRequestId(request) },
    );
    return projectResponseEnvelopeSchema.parse(
      apiSuccess({ project: serializeProject(project) }),
    );
  }

  // Archive and restore are actions on an existing project, so they answer 200 with the updated
  // resource instead of Nest's POST default 201 Created.
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const { organizationId, id } = organizationProjectIdParamSchema.parse(rawParams);
    const { reason } = optionalProjectReasonSchema.parse(body);
    const project = await this.archiveProject.execute(principal.id, organizationId, id, {
      requestId: getRequestId(request),
      reason,
    });
    return projectResponseEnvelopeSchema.parse(
      apiSuccess({ project: serializeProject(project) }),
    );
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const { organizationId, id } = organizationProjectIdParamSchema.parse(rawParams);
    const { reason } = optionalProjectReasonSchema.parse(body);
    const project = await this.restoreProject.execute(principal.id, organizationId, id, {
      requestId: getRequestId(request),
      reason,
    });
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
