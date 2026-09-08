import { randomUUID } from 'node:crypto';
import type { Request } from 'express';

export function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  const item = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : undefined;
}

export function getRequestId(request: Request): string {
  const value = request.header('x-request-id');
  return value?.trim() || randomUUID();
}
