import { apiServerFetch } from "@/lib/api-server";
import type { Profile } from "../types";

export async function getProfile(): Promise<Profile | null> {
  try {
    const result = await apiServerFetch<{
      profile: {
        id: string;
        displayName: string;
        avatarUrl: string | null;
        bio: string | null;
        timezone: string | null;
        platformRole: "ADMIN" | "USER";
        createdAt: string;
        updatedAt: string;
      };
      connections: NonNullable<Profile["connections"]>;
    }>("profile");
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
