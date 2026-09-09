import { describe, expect, it } from 'vitest';
import { HealthCheckUseCase } from './health-check-use-case.js';

describe('HealthCheckUseCase', () => {
  it('returns the API health status', () => {
    expect(new HealthCheckUseCase().execute()).toMatchObject({
      status: 'ok',
      service: 'project-forge-api',
    });
  });
});
