import { z } from "zod";

const list = () =>
  z.preprocess(
    (value) => typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : value,
    z.array(z.string()).optional(),
  );

export const listAuditLogsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
  search: z.string().trim().max(200).default(""),
  actions: list(),
  resourceTypes: list(),
  actorRole: z.enum(["ADMIN", "EDITOR"] as const).optional(),
  relationship: z.enum(["all", "actor", "target"] as const).default("all"),
  from: z.string().optional(),
  to: z.string().optional(),
  sortBy: z.literal("createdAt").default("createdAt"),
  sortDirection: z.enum(["asc", "desc"] as const).default("desc"),
});

export function parseListAuditLogsQuery(searchParams: URLSearchParams) {
  const parsed = listAuditLogsSchema.safeParse(Object.fromEntries(searchParams.entries()));
  return parsed.success ? parsed.data : listAuditLogsSchema.parse({});
}
