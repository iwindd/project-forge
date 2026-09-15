import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from './common/audit/audit.module.js';
import { SecurityModule } from './common/security/security.module.js';
import { validateEnvironment } from './common/config/configuration.js';
import { DatabaseModule } from './common/database/database.module.js';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { OrganizationsModule } from './modules/organizations/organizations.module.js';
import { ProfileModule } from './modules/profile/profile.module.js';
import { IssuesModule } from './modules/issues/issues.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    AuditModule,
    SecurityModule,
    AuthModule,
    AuditLogsModule,
    UsersModule,
    OrganizationsModule,
    ProfileModule,
    ProjectsModule,
    IssuesModule,
    HealthModule,
  ],
})
export class AppModule {}
