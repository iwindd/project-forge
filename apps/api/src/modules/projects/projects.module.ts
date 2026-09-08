import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import {
  ArchiveProjectUseCase,
  CreateProjectUseCase,
  GetProjectUseCase,
  ListProjectsUseCase,
  UpdateProjectUseCase,
} from './application/use-cases/project.use-cases.js';
import { ProjectsController } from './presentation/projects.controller.js';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule],
  controllers: [ProjectsController],
  providers: [
    ListProjectsUseCase,
    GetProjectUseCase,
    CreateProjectUseCase,
    UpdateProjectUseCase,
    ArchiveProjectUseCase,
  ],
})
export class ProjectsModule {}
