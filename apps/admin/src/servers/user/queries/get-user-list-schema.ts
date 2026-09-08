import { z } from "zod";

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(10),
  search: z.string().trim().max(100).default(""),
  role: z.enum(["ADMIN", "EDITOR"] as const).optional(),
  status: z.enum(["all", "active", "inactive"] as const).default("all"),
  sortBy: z
    .enum(["name", "email", "role", "isActive", "createdAt"] as const)
    .default("createdAt"),
  sortDirection: z.enum(["asc", "desc"] as const).default("desc"),
});

export function parseListUsersQuery(
  searchParams: URLSearchParams,
): z.infer<typeof listUsersSchema> {
  const parsed = listUsersSchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  );

  return parsed.success ? parsed.data : listUsersSchema.parse({});
}
