import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AdminGuard } from './admin.guard.js';

describe('AdminGuard', () => {
  it('records a safe authorization failure before rejecting access', async () => {
    const security = { record: vi.fn().mockResolvedValue(undefined) };
    const request = {
      headers: { 'user-agent': 'test-agent' },
      ip: '127.0.0.1',
      header: vi.fn((name: string) => (name === 'x-request-id' ? 'request-123' : undefined)),
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    };

    await expect(new AdminGuard(security).canActivate(context as never)).rejects.toBeInstanceOf(ForbiddenException);

    expect(security.record).toHaveBeenCalledWith({
      organizationId: null,
      userId: null,
      event: 'AUTHORIZATION_FAILED',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      metadata: { requestId: 'request-123', code: 'ADMIN_REQUIRED' },
    });
  });
});
