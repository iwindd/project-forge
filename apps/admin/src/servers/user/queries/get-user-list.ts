import { apiServerFetchEnvelope } from "@/lib/api-server";
import { userListItemSchema, userListMetaSchema } from "../schemas";
import type { UserListQuery, UserListResult } from "../types";

export async function getUserList(query: UserListQuery): Promise<UserListResult> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status && query.status !== "all") {
    params.set("status", query.status);
  }
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  const result = await apiServerFetchEnvelope(
    `admin/users?${params}`,
    userListItemSchema.array(),
    userListMetaSchema
  );
  return {
    data: result.data.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    })),
    total: result.meta?.total ?? result.data.length,
  } satisfies UserListResult;
}
