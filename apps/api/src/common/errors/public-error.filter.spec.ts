import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
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

  it('maps presentation validation failures to a 422 error envelope', () => {
    const response = {
      header: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const request = {
      header: vi.fn().mockReturnValue('request-422'),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    };
    const parsed = z.object({ name: z.string().min(1) }).safeParse({ name: '' });

    if (parsed.success) throw new Error('Expected the fixture to be invalid');

    new PublicErrorFilter().catch(parsed.error, host as never);

    expect(response.status).toHaveBeenCalledWith(422);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'INVALID_INPUT',
        message: 'Request validation failed',
        requestId: 'request-422',
        details: { issues: parsed.error.issues },
      },
    });
  });
});
