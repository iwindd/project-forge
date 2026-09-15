import { z } from 'zod';

export const githubIssueSchema = z.object({
  repository: z.string().min(1),
  number: z.number().int().nonnegative(),
  title: z.string(),
  state: z.enum(['open', 'closed']),
  author: z.string().min(1),
  labels: z.array(z.string()),
  assignees: z.array(z.string()),
  updatedAt: z.string().min(1),
  url: z.url(),
});

export const githubIssueListResponseSchema = z.object({
  data: z.array(githubIssueSchema),
  meta: z.object({ page: z.number(), pageSize: z.number(), hasNext: z.boolean() }),
});
