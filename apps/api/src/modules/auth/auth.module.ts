import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SESSION_AUTHENTICATOR } from '../../common/auth/auth.types.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { AuditModule } from '../../common/audit/audit.module.js';
import {
  AUTH_CONFIG,
  GITHUB_OAUTH,
  SECRET_CIPHER,
  TOKEN_GENERATOR,
  TOKEN_HASHER,
} from './application/ports/auth.ports.js';
import { CompleteGithubLoginUseCase } from './application/use-cases/complete-github-login.use-case.js';
import {
  AuthenticateSessionUseCase,
  IssueSessionUseCase,
  LogoutUseCase,
} from './application/use-cases/session.use-cases.js';
import { StartGithubLoginUseCase } from './application/use-cases/start-github-login.use-case.js';
import { GithubOAuthAdapter } from './infrastructure/github/github-oauth.adapter.js';
import { AesSecretCipherAdapter } from './infrastructure/crypto/aes-secret-cipher.adapter.js';
import { NodeTokenGeneratorAdapter } from './infrastructure/crypto/node-token-generator.adapter.js';
import { Sha256TokenHasherAdapter } from './infrastructure/crypto/sha256-token-hasher.adapter.js';
import { AdminGuard } from '../../common/auth/admin.guard.js';
import { ApprovedGuard } from '../../common/auth/approved.guard.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { AuthController } from './presentation/auth.controller.js';
import { SecurityModule } from '../../common/security/security.module.js';
import { ProfileConnectionRepository } from './infrastructure/persistence/profile-connection.repository.js';
import { OrganizationService } from '../organizations/application/organization.service.js';

@Module({
  imports: [ConfigModule, DatabaseModule, AuditModule, SecurityModule],
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        githubClientId: config.get<string>('GITHUB_CLIENT_ID')?.trim() ?? '',
        githubClientSecret: config.get<string>('GITHUB_CLIENT_SECRET')?.trim() ?? '',
        githubCallbackUrl:
          config.get<string>('GITHUB_CALLBACK_URL') ?? 'http://localhost:5050/api/v1/auth/github/callback',
        githubScopes: config.get<string>('GITHUB_SCOPES') || 'read:user user:email',
        adminGithubIds: new Set(
          (config.get<string>('ADMIN_GITHUB_IDS') || '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean),
        ),
        sessionSecret: config.get<string>('SESSION_SECRET')?.trim() ?? '',
        sessionTtlSeconds: config.get<number>('SESSION_TTL_SECONDS') ?? 604800,
        cookieSecure: config.get<boolean>('COOKIE_SECURE') ?? false,
        adminOrigin: config.get<string>('ADMIN_ORIGIN') ?? 'http://localhost:5051',
      }),
    },
    { provide: GITHUB_OAUTH, useClass: GithubOAuthAdapter },
    { provide: TOKEN_GENERATOR, useClass: NodeTokenGeneratorAdapter },
    { provide: TOKEN_HASHER, useClass: Sha256TokenHasherAdapter },
    { provide: SECRET_CIPHER, useClass: AesSecretCipherAdapter },
    StartGithubLoginUseCase,
    CompleteGithubLoginUseCase,
    IssueSessionUseCase,
    AuthenticateSessionUseCase,
    LogoutUseCase,
    ProfileConnectionRepository,
    OrganizationService,
    { provide: SESSION_AUTHENTICATOR, useExisting: AuthenticateSessionUseCase },
    SessionGuard,
    ApprovedGuard,
    AdminGuard,
  ],
  exports: [SessionGuard, ApprovedGuard, AdminGuard, SESSION_AUTHENTICATOR],
})
export class AuthModule {}
