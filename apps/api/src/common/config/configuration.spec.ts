import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './configuration.js';

describe('validateEnvironment', () => {
  it('provides safe local Hermes defaults without returning a browser credential', () => {
    const environment = validateEnvironment({});

    expect(environment.HERMES_COMMAND).toBe('hermes');
    expect(environment.HERMES_GATEWAY_URL).toBeUndefined();
    expect(environment.HERMES_GATEWAY_HOST).toBe('127.0.0.1');
    expect(environment.HERMES_GATEWAY_PORT).toBe(9119);
    expect(environment.HERMES_GATEWAY_PATH).toBe('/api/ws');
    expect(environment.HERMES_GATEWAY_TOKEN).toBeUndefined();
    expect(environment.HERMES_AUTOSTART).toBe(true);
  });

  it('accepts WebSocket endpoints and rejects HTTP endpoints', () => {
    expect(validateEnvironment({ HERMES_GATEWAY_URL: 'wss://hermes.example.test/api/ws' }).HERMES_GATEWAY_URL).toBe(
      'wss://hermes.example.test/api/ws',
    );
    expect(() => validateEnvironment({ HERMES_GATEWAY_URL: 'https://hermes.example.test/api/ws' })).toThrow();
  });
});
