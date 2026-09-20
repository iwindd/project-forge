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
});
