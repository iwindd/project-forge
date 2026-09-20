import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_TAG_TYPES, api } from '@/lib/api/api';
import { hermesAgentsApi } from './hermes-agents-api';

const roster = {
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
      readiness: 'ready' as const,
      message: 'Ready to use',
      action: 'use' as const,
      path: 'must-not-leak',
      gatewayToken: 'must-not-leak',
    },
  ],
  runtime: {
    state: 'ready' as const,
    message: 'Hermes is ready',
    action: null,
  },
  permissions: { canConfigure: false },
  refreshedAt: '2026-09-20T00:00:00.000Z',
  gatewayToken: 'must-not-leak',
};

function createStore() {
  return configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
  });
}

describe('shared Agent browser API contracts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the shared local roster through the authenticated API and strips unsafe fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: roster }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await createStore().dispatch(hermesAgentsApi.endpoints.getSharedAgents.initiate());

    expect(result).toMatchObject({
      data: {
        agents: [{ handle: 'lyla', readiness: 'ready', action: 'use' }],
        permissions: { canConfigure: false },
      },
    });
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toBe('http://localhost:5050/api/v1/hermes/agents');
    expect(request.method).toBe('GET');
    expect(request.credentials).toBe('include');
  });

  it('registers the cache tag used by the roster endpoint', () => {
    expect(API_TAG_TYPES).toContain('HermesAgents');
  });

  it('rejects a roster that does not satisfy the safe readiness contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              ...roster,
              agents: [{ ...roster.agents[0], readiness: 'unknown' }],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const result = await createStore().dispatch(hermesAgentsApi.endpoints.getSharedAgents.initiate());

    expect(result).toMatchObject({ error: { name: 'ZodError' } });
  });

  it('loads safe runtime-backed configuration options for the Platform Admin form', async () => {
    const options = {
      models: [
        {
          provider: 'openai-codex',
          name: 'OpenAI Codex',
          models: ['gpt-5.6-luna'],
          apiUrl: 'must-not-leak',
          keyEnv: 'OPENAI_API_KEY',
        },
      ],
      skills: ['skill-a'],
      toolsets: [{ name: 'coding', label: 'Coding', description: 'Coding tools', toolCount: 4 }],
      runtime: { state: 'ready' as const, message: 'Hermes is ready', action: null },
      refreshedAt: '2026-09-20T00:00:00.000Z',
      gatewayToken: 'must-not-leak',
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: options }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await createStore().dispatch(hermesAgentsApi.endpoints.getSharedAgentOptions.initiate());

    expect(result).toMatchObject({ data: { models: [{ provider: 'openai-codex' }], skills: ['skill-a'] } });
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toBe('http://localhost:5050/api/v1/hermes/agents/options');
    expect(request.method).toBe('GET');
  });

  it('creates a shared Agent and keeps section status plus safe read-back data', async () => {
    const creation = {
      handle: 'builder',
      status: 'ready' as const,
      agent: {
        handle: 'builder',
        displayName: 'Builder',
        description: 'Shared implementation Agent',
        isDefault: false,
        model: 'gpt-5.6-luna',
        provider: 'openai-codex',
        skillCount: 1,
        hasAvatar: false,
        readiness: 'ready' as const,
        message: 'Ready to use',
        action: 'use' as const,
      },
      sections: {
        identity: { status: 'applied' as const },
        role: { status: 'applied' as const },
        personality: { status: 'applied' as const },
        model: { status: 'applied' as const },
        skills: { status: 'applied' as const },
        toolsets: { status: 'applied' as const },
        avatar: { status: 'skipped' as const },
        readback: { status: 'applied' as const },
        runtime: { status: 'applied' as const },
        audit: { status: 'applied' as const },
      },
      requiresConfirmation: false,
      refreshedAt: '2026-09-20T00:00:00.000Z',
      filesystemPath: 'must-not-leak',
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: creation }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await createStore().dispatch(
      hermesAgentsApi.endpoints.createSharedAgent.initiate({
        handle: 'builder',
        displayName: 'Builder',
        description: 'Shared implementation Agent',
        role: 'Implementer',
        personality: 'You are a careful implementation assistant.',
        provider: 'openai-codex',
        model: 'gpt-5.6-luna',
        skills: ['skill-a'],
        toolsets: ['coding'],
        confirmExpensiveModel: false,
        avatar: null,
      }),
    );

    expect(result).toMatchObject({ data: { status: 'ready', agent: { handle: 'builder' } } });
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.url).toBe('http://localhost:5050/api/v1/hermes/agents');
    expect(request.method).toBe('POST');
    await expect(request.json()).resolves.toMatchObject({ handle: 'builder', model: 'gpt-5.6-luna' });
  });
});
