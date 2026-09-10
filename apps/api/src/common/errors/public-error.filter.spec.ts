import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PublicErrorFilter } from './public-error.filter.js';

describe('PublicErrorFilter', () => {
  it('returns the standard error envelope with a request id', () => {
    const response = {
      header: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const request = {
      header: vi.fn().mockReturnValue('request-123'),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    };

    new PublicErrorFilter().catch(
      new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Please sign in with GitHub',
      }),
      host as never,
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.header).toHaveBeenCalledWith('X-Request-ID', 'request-123');
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Please sign in with GitHub',
        requestId: 'request-123',
        details: {},
      },
    });
  });
});
