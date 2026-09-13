import { describe, expect, it } from 'vitest';
import { parseUpdateOrganizationResponse } from './organization-api';

const organization = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Organization A',
  slug: 'organization-a',
  type: 'SHARED' as const,
  status: 'ACTIVE' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('organization transport contracts', () => {
  it('parses the full organization mutation response', () => {
    expect(parseUpdateOrganizationResponse({ organization })).toEqual({
      organization,
    });
  });

  it('rejects malformed organization mutation output', () => {
    expect(() =>
      parseUpdateOrganizationResponse({
        organization: { ...organization, id: 'organization-id' },
      }),
    ).toThrow();
  });
});
