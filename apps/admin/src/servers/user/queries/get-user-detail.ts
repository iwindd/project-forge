import { apiServerFetch } from "@/lib/api-server";
import { auth } from "@/auth";
import type { UserDetail } from "../types";

type ApiUser = {
  id: string;
  githubLogin: string;
  name: string | null;
  role: "ADMIN" | "USER" | "OWNER" | "MEMBER";
  accessStatus: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function toUser(user: ApiUser): UserDetail {
  return {
    id: user.id,
    name: user.name ?? user.githubLogin,
    email: user.githubLogin,
    role: user.role === "ADMIN" || user.role === "OWNER" ? "ADMIN" : "EDITOR",
    isActive: user.isActive && user.accessStatus !== "SUSPENDED",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getUserDetail(userId: string) {
  try {
    const session = await auth();
    const organizationId = session?.user.activeOrganizationId ?? session?.organizations?.[0]?.id;
    const result = await apiServerFetch<{ user: ApiUser }>(
      organizationId
        ? `organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`
        : `admin/users/${encodeURIComponent(userId)}`,
    );
    return toUser(result.user);
  } catch {
    return null;
  }
}
