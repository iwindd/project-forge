import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildHermesChatUrl } from './use-hermes-chat';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildHermesChatUrl', () => {
  it('uses the public browser origin instead of a loopback API origin on a remote device', () => {
    vi.stubGlobal('window', { location: { origin: 'https://forge.iwindd.dev' } });

    expect(buildHermesChatUrl('http://localhost:5050/api/v1')).toBe('wss://forge.iwindd.dev/api/v1/hermes/chat');
  });

  it('keeps the configured loopback API origin during local development', () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:5051' } });

    expect(buildHermesChatUrl('http://localhost:5050/api/v1')).toBe('ws://localhost:5050/api/v1/hermes/chat');
  });
});
