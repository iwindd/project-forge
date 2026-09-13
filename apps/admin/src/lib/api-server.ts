import { cookies } from 'next/headers';
import { z } from 'zod';
import { apiErrorResponseSchema } from './api/contracts';

const apiOrigin = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5050';

export class ApiServerError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown,
    public readonly requestId: string | null,
  ) {
    super(message);
    this.name = 'ApiServerError';
  }
}

export function isApiServerForbidden(error: unknown): error is ApiServerError {
  return error instanceof ApiServerError && error.status === 403;
}

async function fetchApiEnvelope<T, M>(
  path: string,
  schema: z.ZodType<T>,
  metaSchema: z.ZodType<M>,
  init?: RequestInit,
): Promise<{ data: T; meta?: M }> {
  const cookieStore = await cookies();
  const response = await fetch(`${apiOrigin}/api/v1/${path.replace(/^\//, '')}`, {
    ...init,
    headers: {
      cookie: cookieStore.toString(),
      'content-type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  });

  const requestId = response.headers.get('x-request-id');
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = apiErrorResponseSchema.safeParse(body);
    if (parsedError.success) {
      throw new ApiServerError(
        response.status,
        parsedError.data.error.code,
        parsedError.data.error.message,
        parsedError.data.error.details,
        parsedError.data.error.requestId,
      );
    }

    throw new ApiServerError(
      response.status,
      'API_REQUEST_FAILED',
      `API request failed with ${response.status}`,
      body,
      requestId,
    );
  }

  const envelope = z.object({ data: schema, meta: metaSchema.optional() }).safeParse(body);
  if (!envelope.success) {
    throw new ApiServerError(
      response.status,
      'INVALID_API_RESPONSE',
      'The API returned an invalid response contract',
      envelope.error.issues,
      requestId,
    );
  }

  return envelope.data;
}

export async function apiServerFetchEnvelope<T, M>(
  path: string,
  schema: z.ZodType<T>,
  metaSchema: z.ZodType<M>,
  init?: RequestInit,
): Promise<{ data: T; meta?: M }> {
  return fetchApiEnvelope(path, schema, metaSchema, init);
}

export async function apiServerFetch<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const envelope = await fetchApiEnvelope(path, schema, z.unknown(), init);
  return envelope.data;
}
