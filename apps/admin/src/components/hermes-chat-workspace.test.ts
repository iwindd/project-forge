import { describe, expect, it } from 'vitest';
import { canComposeChat, snapshotContainsAssistantReply, snapshotContainsUserMessage } from './hermes-chat-workspace';

describe('chat composer availability', () => {
  it('keeps the composer focusable while the chat transport reconnects', () => {
    expect(canComposeChat({} as never, 'offline')).toBe(true);
    expect(canComposeChat({} as never, 'connecting')).toBe(true);
    expect(canComposeChat(null, 'connected')).toBe(false);
  });
});

describe('chat snapshot reconciliation', () => {
  it('recognizes a persisted assistant reply after the pending user message', () => {
    expect(
      snapshotContainsAssistantReply(
        {
          sessionId: '770e8400-e29b-41d4-a716-446655440000',
          agentHandle: 'lyla',
          title: 'Friendly greeting',
          messages: [
            { role: 'user', text: 'Hi', timestamp: null, rowId: null },
            { role: 'assistant', text: 'Hi. What would you like to work on?', timestamp: null, rowId: null },
          ],
          messageCount: 2,
          status: 'idle',
          inflight: null,
        },
        'Hi',
      ),
    ).toBe(true);
  });

  it('recognizes a persisted user prompt while its assistant turn is still inflight', () => {
    expect(
      snapshotContainsUserMessage(
        {
          sessionId: '770e8400-e29b-41d4-a716-446655440000',
          agentHandle: 'lyla',
          title: 'Friendly greeting',
          messages: [],
          messageCount: 0,
          status: 'streaming',
          inflight: { user: 'Hi', assistant: 'Hello', streaming: true, status: 'streaming' },
        },
        'Hi',
      ),
    ).toBe(true);
  });
});
