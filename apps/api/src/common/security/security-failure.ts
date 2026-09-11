import type { Request } from 'express';
import { getRequestId } from '../http/request-context.js';
import type { SecurityLogPort } from './security-log.port.js';

type SecurityFailureInput = {
  request: Request;
  event: 'AUTHENTICATION_FAILED' | 'AUTHORIZATION_FAILED';
  code: string;
  userId?: string | null;
  provider?: string | null;
};

/** Records only request diagnostics and a fixed failure code; never exception or credential data. */
export async function recordSecurityFailure(security: SecurityLogPort, input: SecurityFailureInput): Promise<void> {
  try {
    await security.record({
      organizationId: null,
      userId: input.userId ?? null,
      ...(input.provider ? { provider: input.provider } : {}),
      event: input.event,
      ipAddress: input.request.ip ?? input.request.socket?.remoteAddress ?? null,
      userAgent: getUserAgent(input.request),
      metadata: { requestId: getRequestId(input.request), code: input.code },
    });
  } catch {
    // Security logging must not change the existing authentication response.
  }
}

function getUserAgent(request: Request): string | null {
  const value = request.headers['user-agent'];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
