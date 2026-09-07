import type { AccessStatus, UserRole } from '../../modules/users/user.entity.js';

export type AuthenticatedPrincipal = {
  id: string;
  githubUserId: string;
  githubLogin: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  accessStatus: AccessStatus;
  isActive: boolean;
};
