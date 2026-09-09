import { apiServerFetch } from "@/lib/api-server";
import { profileResponseSchema } from "../schemas";
import type { Profile } from "../types";

export async function getProfile(): Promise<Profile | null> {
  try {
    const result = await apiServerFetch("profile", profileResponseSchema);
    return {
      id: result.profile.id,
      name: result.profile.displayName,
      email: result.connections.find((connection) => connection.provider === "GITHUB")?.email ?? null,
      role: result.profile.platformRole === "ADMIN" ? "ADMIN" : "EDITOR",
      createdAt: result.profile.createdAt,
      updatedAt: result.profile.updatedAt,
      avatarUrl: result.profile.avatarUrl,
      bio: result.profile.bio,
      timezone: result.profile.timezone,
      connections: result.connections,
    };
  } catch {
    return null;
  }
}
