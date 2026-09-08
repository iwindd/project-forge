import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().trim().max(120).optional().default(''),
  githubUrl: z.string().trim().url(),
  sourceBranch: z.string().trim().min(1).max(120).default('main'),
  targetBranch: z.string().trim().min(1).max(120).default('main'),
  nodeVersion: z.string().trim().max(40).optional().default(''),
  environmentMetadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
