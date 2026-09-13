import { describe, expect, it } from 'vitest';
import { parseSecurityLogsResponse } from './security-api';

describe('security API response contract', () => {
  it('parses security logs and pagination metadata after envelope unwrapping', () => {
    const result = parseSecurityLogsResponse(
      [
        {
          id: 'log-1',
          organizationId: null,
          userId: 'user-1',
          event: 'LOGIN_SUCCEEDED',
          provider: 'GITHUB',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          metadata: null,
          createdAt: '2026-09-10T00:00:00.000Z',
        },
      ],
      { apiMeta: { page: 1, pageSize: 25, total: 1, totalPages: 1 } },
    );

    expect(result).toEqual({
      data: [expect.objectContaining({ id: 'log-1', event: 'LOGIN_SUCCEEDED' })],
      page: 1,
      pageSize: 25,
      total: 1,
    });
  });
});
