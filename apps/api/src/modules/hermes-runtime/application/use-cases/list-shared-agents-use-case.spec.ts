import { describe, expect, it, vi } from 'vitest';
import { ExternalServiceError } from '../../../../common/errors/application-error.js';
import type { HermesRuntimeService } from '../hermes-runtime.service.js';
import { HermesGatewayRpcError } from '../../infrastructure/hermes-gateway.client.js';
import type { HermesRuntimeStatus } from '../../domain/hermes-runtime.types.js';
import { ListSharedAgentsUseCase } from './list-shared-agents-use-case.js';

const readyStatus: HermesRuntimeStatus = {
  state: 'ready',
  endpoint: { host: '127.0.0.1', port: 9119, path: '/api/ws', managed: true },
  version: '0.21.3',
  capabilities: ['gateway.ping'],
  backendEpoch: 'epoch-1',
  serverRequests: 'legacy',
  checkedAt: '2026-09-20T00:00:00.000Z',
  message: 'Hermes is ready',
  action: null,
};

const profiles = [
  {
    name: 'lyla',
    path: 'C:\\Users\\freew\\AppData\\Local\\hermes\\profiles\\lyla',
    is_default: true,
    model: 'gpt-5.6-luna',
    provider: 'openai-codex',
    description: 'Shared local coding Agent',
    display_name: 'Lyla',
    skill_count: 12,
    api_key: 'must-not-leak',
  },
];

function runtime(request: HermesRuntimeService['request'], status = readyStatus): HermesRuntimeService {
  return {
    request,
    getStatus: () => status,
  } as unknown as HermesRuntimeService;
}

describe('ListSharedAgentsUseCase', () => {
  it('lists shared Hermes Profiles for every authenticated user without exposing secrets or paths', async () => {
    const request = vi.fn(async (method: string) => {
      if (method === 'profiles.list') return { profiles, bot_mode_protocol: true };
      if (method === 'setup.runtime_check') return { ok: true, provider: 'openai-codex', model: 'gpt-5.6-luna' };
      throw new Error(`unexpected method ${method}`);
    });

    const result = await new ListSharedAgentsUseCase(runtime(request as HermesRuntimeService['request'])).execute({
      canConfigure: false,
    });

    expect(result).toMatchObject({
      runtime: { state: 'ready', message: 'Hermes is ready', action: null },
      permissions: { canConfigure: false },
      agents: [
        {
          handle: 'lyla',
          displayName: 'Lyla',
          description: 'Shared local coding Agent',
          isDefault: true,
          model: 'gpt-5.6-luna',
          provider: 'openai-codex',
          skillCount: 12,
          hasAvatar: false,
          readiness: 'ready',
          message: 'Ready to use',
          action: 'use',
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('C:\\Users\\freew');
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    expect(request).toHaveBeenNthCalledWith(1, 'profiles.list', { include_sessions: false });
    expect(request).toHaveBeenNthCalledWith(2, 'setup.runtime_check', { profile: 'lyla' });
  });

  it('classifies incomplete, unavailable, and incompatible Profiles with safe actions', async () => {
    const request = vi.fn(async (method: string, params?: unknown) => {
      if (method === 'profiles.list') {
        return {
          profiles: [
            { name: 'missing-model', model: null, provider: null, display_name: '', description: '' },
            { name: 'missing-provider-secret', model: 'gpt-5.6-luna', provider: 'openai-codex' },
            { name: 'legacy-gateway', model: 'gpt-5.6-luna', provider: 'openai-codex' },
            { name: 'C:\\secret\\profile', model: 'gpt-5.6-luna', provider: 'openai-codex' },
          ],
        };
      }
      if ((params as { profile?: string } | undefined)?.profile === 'missing-provider-secret') {
        return { ok: false, provider: 'openai-codex', model: 'gpt-5.6-luna', error: 'No usable credentials found' };
      }
      if ((params as { profile?: string } | undefined)?.profile === 'legacy-gateway') {
        throw new HermesGatewayRpcError(-32601, 'method not found');
      }
      throw new Error(`unexpected method ${method}`);
    });

    const result = await new ListSharedAgentsUseCase(runtime(request as HermesRuntimeService['request'])).execute({
      canConfigure: true,
    });

    expect(result.permissions).toEqual({ canConfigure: true });
    expect(result.agents).toEqual([
      expect.objectContaining({
        handle: 'missing-model',
        readiness: 'incomplete-configuration',
        action: 'configure',
      }),
      expect.objectContaining({
        handle: 'missing-provider-secret',
        readiness: 'unavailable',
        action: 'retry',
      }),
      expect.objectContaining({
        handle: 'legacy-gateway',
        readiness: 'incompatible',
        action: 'retry',
      }),
    ]);
    expect(result.agents.map((agent) => agent.handle)).not.toContain('C:\\secret\\profile');
    expect(JSON.stringify(result)).not.toContain('No usable credentials found');
    expect(JSON.stringify(result)).not.toContain('method not found');
  });

  it('reconciles the roster on every refresh instead of retaining stale Profiles', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ profiles: [{ name: 'first', model: 'm1', provider: 'p1' }] })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ profiles: [{ name: 'second', model: 'm2', provider: 'p2' }] })
      .mockResolvedValue({ ok: true });

    const useCase = new ListSharedAgentsUseCase(runtime(request as HermesRuntimeService['request']));
    const first = await useCase.execute({ canConfigure: false });
    const second = await useCase.execute({ canConfigure: false });

    expect(first.agents.map((agent) => agent.handle)).toEqual(['first']);
    expect(second.agents.map((agent) => agent.handle)).toEqual(['second']);
  });

  it('returns a safe empty roster when the local runtime is unavailable', async () => {
    const request = vi.fn(async () => {
      throw new ExternalServiceError('Hermes gateway is not ready', { endpoint: 'must-not-leak' });
    });
    const unavailableStatus: HermesRuntimeStatus = {
      ...readyStatus,
      state: 'missing',
      message: 'Hermes CLI was not found on this host',
      action: 'install-hermes',
    };

    const result = await new ListSharedAgentsUseCase(
      runtime(request as HermesRuntimeService['request'], unavailableStatus),
    ).execute({ canConfigure: false });

    expect(result).toMatchObject({
      agents: [],
      runtime: {
        state: 'missing',
        message: 'Hermes CLI was not found on this host',
        action: 'install-hermes',
      },
    });
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
  });
});
