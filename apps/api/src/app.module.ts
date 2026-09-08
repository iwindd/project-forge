import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from './common/audit/audit.module.js';
import { validateEnvironment } from './common/config/configuration.js';
import { DatabaseModule } from './common/database/database.module.js';
import { AccessRequestsModule } from './modules/access-requests/access-requests.module.js';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    AuditModule,
    AuthModule,
    AccessRequestsModule,
    AuditLogsModule,
    UsersModule,
    ProjectsModule,
    HealthModule,
  ],
})
export class AppModule {}
