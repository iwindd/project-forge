import { describe, expect, it } from 'vitest';
import {
  parseHermesSessionList,
  parseHermesSessionResponse,
} from './hermes-sessions-schemas';

describe('Hermes session browser contracts', () => {
  it('accepts the safe list envelope', () => {
    const result = parseHermesSessionList({
      sessions: [
          {
            id: '770e8400-e29b-41d4-a716-446655440000',
            agentHandle: 'lyla',
            title: 'งานล่าสุด',
            preview: 'สรุปงาน',
            messageCount: 2,
            startedAt: '2026-09-20T10:00:00.000Z',
            active: true,
            closedAt: null,
          },
      ],
    });

    expect(result.sessions).toHaveLength(1);
  });

  it('does not accept a Hermes identifier in browser Session payloads', () => {
    expect(() =>
      parseHermesSessionResponse({
        session: {
            id: '770e8400-e29b-41d4-a716-446655440000',
            agentHandle: 'lyla',
            title: '',
            preview: '',
            messageCount: 0,
            startedAt: null,
            active: true,
            closedAt: null,
          },
        snapshot: {
            sessionId: '770e8400-e29b-41d4-a716-446655440000',
            agentHandle: 'lyla',
            title: '',
            messages: [],
            messageCount: 0,
            status: 'idle',
            inflight: null,
            hermesSessionId: 'must-not-cross-boundary',
        },
      }),
    ).toThrow();
  });
});
