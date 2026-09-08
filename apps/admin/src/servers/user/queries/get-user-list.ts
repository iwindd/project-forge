import { apiServerFetch } from "@/lib/api-server";
import type { UserListQuery, UserListResult } from "../types";

export async function getUserList(query: UserListQuery): Promise<UserListResult> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status && query.status !== "all") {
    params.set("status", query.status === "active" ? "APPROVED" : "SUSPENDED");
  }
  params.set("page", String(query.page));
  params.set("limit", String(query.pageSize));
  return apiServerFetch<UserListResult>(`admin/users?${params}`);
}
