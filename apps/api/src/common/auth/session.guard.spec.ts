import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SessionGuard } from './session.guard.js';

describe('SessionGuard', () => {
  it('records a safe authentication failure without logging the session token', async () => {
    const security = { record: vi.fn().mockResolvedValue(undefined) };
    const authenticator = { principalFromToken: vi.fn().mockResolvedValue(null) };
    const request = {
      headers: { cookie: 'pf_session=session-secret', 'user-agent': 'test-agent' },
      ip: '127.0.0.1',
      header: vi.fn((name: string) => (name === 'x-request-id' ? 'request-123' : undefined)),
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    };

    await expect(new SessionGuard(authenticator, security).canActivate(context as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(security.record).toHaveBeenCalledWith({
      organizationId: null,
      userId: null,
      event: 'AUTHENTICATION_FAILED',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      metadata: { requestId: 'request-123', code: 'UNAUTHENTICATED' },
    });
    expect(JSON.stringify(security.record.mock.calls)).not.toContain('session-secret');
  });
});
