import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(5050),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  ADMIN_ORIGIN: z.string().url().default('http://localhost:5051'),
  DATABASE_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().optional(),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().url().default('http://localhost:5050/api/v1/auth/github/callback'),
  GITHUB_SCOPES: z.string().default('read:user user:email'),
  ADMIN_GITHUB_IDS: z.string().default(''),
});

export function validateEnvironment(environment: Record<string, unknown>) {
  return environmentSchema.parse(environment);
}

export type ValidatedEnvironment = z.infer<typeof environmentSchema>;
