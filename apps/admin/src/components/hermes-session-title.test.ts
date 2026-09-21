import { describe, expect, it } from 'vitest';
import { getHermesChatHeaderTitle, getHermesSessionDisplayTitle } from './hermes-session-title';

describe('getHermesSessionDisplayTitle', () => {
  it('prefers the Agent-generated title', () => {
    expect(getHermesSessionDisplayTitle({ title: 'Friendly greeting', preview: 'Hi lyla' })).toBe('Friendly greeting');
  });

  it('falls back to the first-message preview when the title is empty', () => {
    expect(getHermesSessionDisplayTitle({ title: '  ', preview: 'แต่งกลอนให้หน่อย' })).toBe('แต่งกลอนให้หน่อย');
  });

  it('uses the provided fallback for a blank session', () => {
    expect(getHermesSessionDisplayTitle(null, 'Chat')).toBe('Chat');
  });

  it('adds the Agent display name as the AppHeader prefix', () => {
    expect(getHermesChatHeaderTitle('Lyla', { title: 'ค้นหา hermes ด้วย web_search', preview: '' })).toBe(
      'Lyla · ค้นหา hermes ด้วย web_search',
    );
  });
});
