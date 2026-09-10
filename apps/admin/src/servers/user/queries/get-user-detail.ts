import { apiServerFetch } from "@/lib/api-server";
import {
  normalizeUserRole,
  userDetailResponseSchema,
  type UserDetailResponse,
} from "../schemas";
import type { UserDetail } from "../types";

function toUser(user: UserDetailResponse['user']): UserDetail {
  return {
    id: user.id,
    name: user.name ?? user.githubLogin ?? user.email ?? user.id,
    email: user.email ?? user.githubLogin ?? '',
    role: normalizeUserRole(user.role),
    isActive: user.isActive && user.accessStatus !== 'SUSPENDED',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getUserDetail(userId: string, organizationId: string) {
  try {
    const result = await apiServerFetch(
      `organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
      userDetailResponseSchema,
    );
    return toUser(result.user);
  } catch {
    return null;
  }
}
