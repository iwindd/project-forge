import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { SecurityModule } from '../../common/security/security.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { OrganizationService } from '../organizations/application/organization.service.js';
import { ArchiveProjectUseCase } from './application/use-cases/archive-project-use-case.js';
import { CreateProjectUseCase } from './application/use-cases/create-project-use-case.js';
import { GetProjectUseCase } from './application/use-cases/get-project-use-case.js';
import { ListProjectsUseCase } from './application/use-cases/list-projects-use-case.js';
import { UpdateProjectUseCase } from './application/use-cases/update-project-use-case.js';
import { ProjectsController } from './presentation/projects.controller.js';

@Module({
  imports: [AuthModule, DatabaseModule, AuditModule, SecurityModule],
  controllers: [ProjectsController],
  providers: [
    OrganizationService,
    ListProjectsUseCase,
    GetProjectUseCase,
    CreateProjectUseCase,
    UpdateProjectUseCase,
    ArchiveProjectUseCase,
  ],
})
export class ProjectsModule {}
