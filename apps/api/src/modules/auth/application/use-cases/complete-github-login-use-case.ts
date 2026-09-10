import { Inject, Injectable } from '@nestjs/common';
import { UNIT_OF_WORK } from '../../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../../common/database/unit-of-work.port.js';
import { AccessStatus, createUser, UserRole } from '../../../users/domain/user.js';
import { USER_REPOSITORY } from '../../../users/application/ports/user.repository.js';
import type { UserRepository } from '../../../users/application/ports/user.repository.js';
import { AUTH_CONFIG, GITHUB_OAUTH, SECRET_CIPHER } from '../ports/auth.ports.js';
import type { AuthConfig, GithubOAuthPort, SecretCipherPort } from '../ports/auth.ports.js';
import { IssueSessionUseCase } from './issue-session-use-case.js';
import { toPrincipal } from '../auth.mappers.js';
import type { AuthenticatedPrincipal } from '../../../../common/auth/auth.types.js';
import { InvalidInputError } from '../../../../common/errors/application-error.js';
import { SECURITY_LOGGER } from '../../../../common/security/security-log.port.js';
import type { SecurityLogPort } from '../../../../common/security/security-log.port.js';
import { OrganizationService } from '../../../organizations/application/organization.service.js';
import { ProfileConnectionRepository } from '../../infrastructure/persistence/profile-connection.repository.js';

@Injectable()
export class CompleteGithubLoginUseCase {
  constructor(
    @Inject(GITHUB_OAUTH) private readonly github: GithubOAuthPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SECRET_CIPHER) private readonly cipher: SecretCipherPort,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
    private readonly profilesAndConnections: ProfileConnectionRepository,
    private readonly organizations: OrganizationService,
    @Inject(SECURITY_LOGGER) private readonly security: SecurityLogPort,
    private readonly issueSession: IssueSessionUseCase,
  ) {}

  async execute(code: string): Promise<{
    principal: AuthenticatedPrincipal
    sessionToken: string | null
    organizationSlug: string | null
  }> {
    if (!code.trim()) throw new InvalidInputError('OAuth code is required');
    const result = await this.github.exchangeCode(code);
    const userId = String(result.profile.id);

    return this.unitOfWork.run(async () => {
      let user = await this.users.findByGithubUserId(userId);
      if (!user) user = createUser({ githubUserId: userId, githubLogin: result.profile.login });

      const isConfiguredAdmin = this.config.adminGithubIds.has(userId);
      user.githubLogin = result.profile.login;
      user.name = result.profile.name ?? null;
      user.avatarUrl = result.profile.avatar_url ?? null;
      user.accessStatus =
        user.accessStatus === AccessStatus.APPROVED
          ? AccessStatus.APPROVED
          : isConfiguredAdmin
            ? AccessStatus.APPROVED
            : user.accessStatus || AccessStatus.PENDING;
      user.role = isConfiguredAdmin ? UserRole.ADMIN : user.role || UserRole.USER;
      user.isActive = true;
      user.updatedAt = new Date();
      await this.users.save(user);

      await this.profilesAndConnections.ensureProfile({
        userId: user.id,
        displayName: user.name,
        avatarUrl: user.avatarUrl,
      });
      await this.profilesAndConnections.upsertConnection({
        userId: user.id,
        provider: 'GITHUB',
        providerAccountId: userId,
        providerUsername: result.profile.login,
        providerEmail: result.profile.email,
        providerEmailVerified: result.profile.emailVerified ?? false,
        providerVerifiedEmails: result.profile.verifiedEmails,
        accessTokenCiphertext: this.cipher.encrypt(result.accessToken),
        scopes: result.scope,
      });
      const organizations = await this.organizations.listForUser(user.id);
      const sessionToken = await this.issueSession.issueWithinTransaction(user.id);
      await this.security.record({
        organizationId: organizations[0]?.organization.id ?? null,
        userId: user.id,
        provider: 'GITHUB',
        event: 'LOGIN_SUCCEEDED',
      });
      return {
        principal: toPrincipal(user),
        sessionToken,
        organizationSlug: organizations[0]?.organization.slug ?? null,
      };
    });
  }
}
