import type { AccessStatus, UserRole } from '../../modules/users/domain/user.js';

export type AuthenticatedPrincipal = {
  id: string;
  githubUserId: string;
  githubLogin: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  accessStatus: AccessStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  activeOrganizationId: string | null;
};

export const SESSION_AUTHENTICATOR = Symbol('SESSION_AUTHENTICATOR');

export interface SessionAuthenticator {
  principalFromToken(token: string | undefined): Promise<AuthenticatedPrincipal | null>;
}
