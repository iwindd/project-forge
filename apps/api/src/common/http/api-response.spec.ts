import { describe, expect, it } from 'vitest';
import { apiSuccess } from './api-response.js';

describe('apiSuccess', () => {
  it('creates the standard success envelope', () => {
    expect(apiSuccess({ id: 'resource-id' })).toEqual({
      data: { id: 'resource-id' },
    });
  });

  it('keeps pagination and request metadata under meta', () => {
    expect(apiSuccess(['item'], { page: 1, pageSize: 25, total: 1 })).toEqual({
      data: ['item'],
      meta: { page: 1, pageSize: 25, total: 1 },
    });
  });
});
