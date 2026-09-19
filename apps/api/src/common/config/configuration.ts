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
  HERMES_COMMAND: z.string().trim().min(1).default('hermes'),
  HERMES_GATEWAY_URL: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z
      .string()
      .url()
      .refine(
        (value) => value.startsWith('ws://') || value.startsWith('wss://'),
        'HERMES_GATEWAY_URL must use ws:// or wss://',
      )
      .optional(),
  ),
  HERMES_GATEWAY_HOST: z.string().trim().min(1).default('127.0.0.1'),
  HERMES_GATEWAY_PORT: z.coerce.number().int().min(1).max(65535).default(9119),
  HERMES_GATEWAY_PATH: z.string().regex(/^\//).default('/api/ws'),
  HERMES_GATEWAY_TOKEN: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().min(1).optional(),
  ),
  HERMES_AUTOSTART: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  HERMES_ISOLATED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  HERMES_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(250).max(120_000).default(10_000),
  HERMES_START_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(15_000),
});

export function validateEnvironment(environment: Record<string, unknown>) {
  return environmentSchema.parse(environment);
}

export type ValidatedEnvironment = z.infer<typeof environmentSchema>;
