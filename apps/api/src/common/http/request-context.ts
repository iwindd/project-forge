import { randomUUID } from 'node:crypto';
import type { Request } from 'express';

const REQUEST_ID = Symbol('request-id');

type RequestWithRequestId = Request & { [REQUEST_ID]?: string };

export function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  const item = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : undefined;
}

/**
 * Resolves the request ID once per request: the value is memoized on the express `Request`
 * object so every call site (controller mutation and error filter) observes the same ID.
 */
export function getRequestId(request: Request): string {
  const scoped = request as RequestWithRequestId;
  const resolved = scoped[REQUEST_ID];
  if (resolved) return resolved;
  const requestId = request.header('x-request-id')?.trim() || randomUUID();
  scoped[REQUEST_ID] = requestId;
  return requestId;
}
