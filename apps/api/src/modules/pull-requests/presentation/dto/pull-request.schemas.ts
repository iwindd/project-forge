import { z } from 'zod';

export const pullRequestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20),
});

export const pullRequestResponseSchema = z.object({
  repository: z.string(),
  number: z.number().int(),
  title: z.string(),
  state: z.enum(['OPEN', 'CLOSED', 'MERGED']),
  author: z.string(),
  updatedAt: z.string(),
  headBranch: z.string(),
  baseBranch: z.string(),
  url: z.url(),
});

export const pullRequestListResponseSchema = z.object({
  data: z.object({
    items: z.array(pullRequestResponseSchema),
    page: z.number(),
    perPage: z.number(),
    hasNextPage: z.boolean(),
  }),
});
