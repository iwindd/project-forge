import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import type { UserRecord } from '../../users/domain/user.js';

export function toPrincipal(user: UserRecord): AuthenticatedPrincipal {
  return {
    id: user.id,
    githubUserId: user.githubUserId,
    githubLogin: user.githubLogin,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    accessStatus: user.accessStatus,
    isActive: user.isActive,
  };
}
