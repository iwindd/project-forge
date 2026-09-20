import { describe, expect, it, vi } from 'vitest';
import type { HermesRuntimeService } from '../hermes-runtime.service.js';
import type { HermesRuntimeStatus } from '../../domain/hermes-runtime.types.js';
import { GetSharedAgentOptionsUseCase } from './get-shared-agent-options-use-case.js';

const readyStatus: HermesRuntimeStatus = {
  state: 'ready',
  endpoint: { host: '127.0.0.1', port: 9119, path: '/api/ws', managed: true },
  version: '0.21.3',
  capabilities: ['model.options', 'profiles.describe'],
  backendEpoch: 'epoch-1',
  serverRequests: 'advertised',
  checkedAt: '2026-09-20T00:00:00.000Z',
  message: 'Hermes is ready',
  action: null,
};

function runtime(request: unknown): HermesRuntimeService {
  return {
    request: request as HermesRuntimeService['request'],
    getStatus: () => readyStatus,
  } as unknown as HermesRuntimeService;
}

describe('GetSharedAgentOptionsUseCase', () => {
  it('returns safe model, skill, and toolset options from the managed Hermes runtime', async () => {
    const request = vi.fn(async (method: string) => {
      if (method === 'model.options') {
        return {
          providers: [
            {
              slug: 'openai-codex',
              name: 'OpenAI Codex',
              models: ['gpt-5.6-luna'],
              api_url: 'https://secret-provider.invalid',
              key_env: 'OPENAI_API_KEY',
              warning: 'credential=must-not-leak',
            },
          ],
        };
      }
      if (method === 'profiles.list') {
        return {
          profiles: [
            {
              name: 'lyla',
              is_default: true,
              path: 'C:\\Users\\freew\\AppData\\Local\\hermes\\profiles\\lyla',
            },
          ],
        };
      }
      if (method === 'profiles.describe') {
        return {
          name: 'lyla',
          skills: [{ name: 'skill-a', enabled: true }],
          toolsets: [
            {
              name: 'coding',
              label: 'Coding',
              description: 'api_key=OPENAI_API_KEY',
              tool_count: 4,
              enabled: true,
            },
          ],
          provider: 'must-not-leak',
        };
      }
      throw new Error(`unexpected method ${method}`);
    });

    const result = await new GetSharedAgentOptionsUseCase(runtime(request)).execute();

    expect(result).toMatchObject({
      models: [{ provider: 'openai-codex', name: 'OpenAI Codex', models: ['gpt-5.6-luna'] }],
      skills: ['skill-a'],
      toolsets: [{ name: 'coding', label: 'Coding', description: '', toolCount: 4 }],
      runtime: { state: 'ready', message: 'Hermes is ready', action: null },
    });
    expect(JSON.stringify(result)).not.toContain('secret-provider.invalid');
    expect(JSON.stringify(result)).not.toContain('OPENAI_API_KEY');
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    expect(JSON.stringify(result)).not.toContain('C:\\Users\\freew');
    expect(request).toHaveBeenNthCalledWith(1, 'model.options', {
      explicit_only: false,
      include_unconfigured: false,
      refresh: false,
    });
    expect(request).toHaveBeenNthCalledWith(2, 'profiles.list', { include_sessions: false });
    expect(request).toHaveBeenNthCalledWith(3, 'profiles.describe', { name: 'lyla' });
  });

  it('returns empty profile-scoped options when Hermes has no Profiles yet', async () => {
    const request = vi.fn(async (method: string) => {
      if (method === 'model.options') return { providers: [] };
      if (method === 'profiles.list') return { profiles: [] };
      throw new Error(`unexpected method ${method}`);
    });

    const result = await new GetSharedAgentOptionsUseCase(runtime(request)).execute();

    expect(result.skills).toEqual([]);
    expect(result.toolsets).toEqual([]);
    expect(result.models).toEqual([]);
    expect(request).not.toHaveBeenCalledWith('profiles.describe', expect.anything());
  });
});
