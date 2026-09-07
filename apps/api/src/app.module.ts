import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AccessRequest } from './modules/access/access-request.entity.js';
import { AuditLog } from './modules/audit/audit-log.entity.js';
import { OAuthAccount } from './modules/auth/oauth-account.entity.js';
import { Session } from './modules/auth/session.entity.js';
import { ProjectMember } from './modules/projects/project-member.entity.js';
import { Project } from './modules/projects/project.entity.js';
import { User } from './modules/users/user.entity.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AccessModule } from './modules/access/access.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MikroOrmModule.forRootAsync({
      driver: PostgreSqlDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        clientUrl: config.getOrThrow<string>('DATABASE_URL'),
        entities: [User, OAuthAccount, Session, AccessRequest, AuditLog, Project, ProjectMember],
        migrations: { path: './dist/src/database/migrations', pathTs: './src/database/migrations' },
      }),
    }),
    AuthModule,
    AccessModule,
    UsersModule,
    ProjectsModule,
    HealthModule,
  ],
})
export class AppModule {}
