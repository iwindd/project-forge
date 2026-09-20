import { describe, expect, it } from 'vitest';
import { sharedAgentCreateFormSchema } from './shared-agent-create-form-schema';

describe('shared Agent create form schema', () => {
  it('accepts a complete validated Agent configuration', () => {
    expect(
      sharedAgentCreateFormSchema.parse({
        handle: 'builder',
        displayName: 'Builder',
        description: 'Shared implementation Agent',
        role: 'Implementer',
        personality: 'You are a careful implementation assistant.',
        provider: 'openai-codex',
        model: 'gpt-5.6-luna',
        skills: ['skill-a'],
        toolsets: ['coding'],
        avatar: null,
      }),
    ).toMatchObject({ handle: 'builder', provider: 'openai-codex' });
  });

  it('rejects unsafe handles, empty role/personality, and duplicate capability selections', () => {
    const result = sharedAgentCreateFormSchema.safeParse({
      handle: '../builder',
      displayName: '',
      description: '',
      role: '',
      personality: '',
      provider: '',
      model: '',
      skills: ['skill-a', 'skill-a'],
      toolsets: ['coding', 'coding'],
      avatar: null,
    });

    expect(result.success).toBe(false);
  });
});
