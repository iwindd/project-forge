import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { getRequestId } from './request-context.js';

function makeRequest(headerValue?: string) {
  const header = vi.fn(() => headerValue);
  return { request: { header } as unknown as Request, header };
}

describe('getRequestId', () => {
  it('resolves one ID per headerless request and reuses it across repeated calls', () => {
    const { request: httpRequest, header } = makeRequest();

    const controllerId = getRequestId(httpRequest);
    const filterId = getRequestId(httpRequest);

    expect(controllerId).toBe(filterId);
    expect(controllerId).toHaveLength(36);
    expect(header).toHaveBeenCalledTimes(1);
  });

  it('honours an inbound x-request-id header and still resolves it once', () => {
    const { request: httpRequest, header } = makeRequest('inbound-request-id');

    expect(getRequestId(httpRequest)).toBe('inbound-request-id');
    expect(getRequestId(httpRequest)).toBe('inbound-request-id');
    expect(header).toHaveBeenCalledTimes(1);
  });

  it('mints a distinct ID for each request', () => {
    const first = getRequestId(makeRequest().request);
    const second = getRequestId(makeRequest().request);

    expect(first).not.toBe(second);
  });

  it('falls back to a minted ID when the inbound header is blank', () => {
    const { request: httpRequest } = makeRequest('   ');

    const resolved = getRequestId(httpRequest);

    expect(resolved).toHaveLength(36);
    expect(getRequestId(httpRequest)).toBe(resolved);
  });
});
