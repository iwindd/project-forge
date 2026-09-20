import { Inject, Injectable } from '@nestjs/common';
import {
  type HermesGatewayRpcError,
  HermesGatewayRpcError as HermesGatewayRpcErrorClass,
} from '../../infrastructure/hermes-gateway.client.js';
import type { HermesRuntimeAction, HermesRuntimeState } from '../../domain/hermes-runtime.types.js';
import { HermesRuntimeService } from '../hermes-runtime.service.js';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(1).max(160),
  is_default: z.boolean().optional().default(false),
  model: z.string().nullable().optional().default(null),
  provider: z.string().nullable().optional().default(null),
  description: z.string().optional().default(''),
  display_name: z.string().optional().default(''),
  skill_count: z.number().int().nonnegative().optional().default(0),
  has_avatar: z.boolean().optional().default(false),
});

const profileListResponseSchema = z.object({
  profiles: z.array(profileSchema),
});

const runtimeCheckResponseSchema = z.object({
  ok: z.boolean(),
});

export type SharedAgentReadiness = 'ready' | 'unavailable' | 'incompatible' | 'incomplete-configuration';
export type SharedAgentAction = 'use' | 'retry' | 'configure';
export type SharedAgentRuntime = {
  state: HermesRuntimeState;
  message: string;
  action: HermesRuntimeAction | null;
};

export type SharedLocalAgent = {
  handle: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  model: string | null;
  provider: string | null;
  skillCount: number;
  hasAvatar: boolean;
  readiness: SharedAgentReadiness;
  message: string;
  action: SharedAgentAction;
};

export type SharedAgentRoster = {
  agents: SharedLocalAgent[];
  runtime: SharedAgentRuntime;
  permissions: {
    canConfigure: boolean;
  };
  refreshedAt: string;
};

type HermesRuntimeReader = Pick<HermesRuntimeService, 'getStatus' | 'request'>;

type Profile = z.infer<typeof profileSchema>;

type ReadinessResult = {
  readiness: SharedAgentReadiness;
  message: string;
  action: SharedAgentAction;
};

const SAFE_RUNTIME_MESSAGES: Partial<Record<HermesRuntimeState, string>> = {
  unconfigured: 'Hermes has not been connected yet',
  detecting: 'Checking the local Hermes runtime',
  starting: 'Starting the managed Hermes backend',
  connecting: 'Connecting to Hermes',
  negotiating: 'Verifying Hermes capabilities',
  ready: 'Hermes is ready',
  missing: 'Hermes CLI was not found on this host',
  incompatible: 'The installed Hermes runtime is not compatible',
  unhealthy: 'The local Hermes runtime is not healthy',
  'port-conflict': 'The configured Hermes port is already used by another service',
};

@Injectable()
export class ListSharedAgentsUseCase {
  constructor(@Inject(HermesRuntimeService) private readonly runtime: HermesRuntimeReader) {}

  async execute(input: { canConfigure: boolean }): Promise<SharedAgentRoster> {
    const refreshedAt = new Date().toISOString();
    const base = {
      permissions: { canConfigure: input.canConfigure },
      refreshedAt,
    };

    try {
      const rawProfiles = await this.runtime.request<unknown>('profiles.list', { include_sessions: false });
      const parsed = profileListResponseSchema.safeParse(rawProfiles);
      if (!parsed.success) {
        return {
          ...base,
          agents: [],
          runtime: this.runtimeSummary('incompatible', 'The Hermes profile roster is not compatible', 'retry'),
        };
      }

      return {
        ...base,
        agents: await Promise.all(
          parsed.data.profiles
            .filter((profile) => isSafeProfileHandle(profile.name))
            .map((profile) => this.inspectProfile(profile)),
        ),
        runtime: this.runtimeSummary(this.runtime.getStatus().state),
      };
    } catch (error) {
      return {
        ...base,
        agents: [],
        runtime: this.runtimeFailure(error),
      };
    }
  }

  private async inspectProfile(profile: Profile): Promise<SharedLocalAgent> {
    const model = safeConfigurationLabel(profile.model);
    const provider = safeConfigurationLabel(profile.provider);
    const displayName = safeDisplayText(profile.display_name, profile.name);
    const description = safeDisplayText(profile.description, '');

    const readiness = !model || !provider ? this.incompleteConfiguration() : await this.checkRuntime(profile.name);

    return {
      handle: profile.name,
      displayName,
      description,
      isDefault: profile.is_default,
      model,
      provider,
      skillCount: profile.skill_count,
      hasAvatar: profile.has_avatar,
      ...readiness,
    };
  }

  private async checkRuntime(profile: string): Promise<ReadinessResult> {
    try {
      const raw = await this.runtime.request<unknown>('setup.runtime_check', { profile });
      const parsed = runtimeCheckResponseSchema.safeParse(raw);
      if (!parsed.success) return this.incompatibleConfiguration();
      return parsed.data.ok ? this.ready() : this.unavailable();
    } catch (error) {
      if (isMethodUnsupported(error)) return this.incompatibleConfiguration();
      return this.unavailable();
    }
  }

  private ready(): ReadinessResult {
    return { readiness: 'ready', message: 'Ready to use', action: 'use' };
  }

  private incompleteConfiguration(): ReadinessResult {
    return {
      readiness: 'incomplete-configuration',
      message: 'This Agent needs model and provider configuration',
      action: 'configure',
    };
  }

  private unavailable(): ReadinessResult {
    return {
      readiness: 'unavailable',
      message: 'The configured provider is not available on this local runtime',
      action: 'retry',
    };
  }

  private incompatibleConfiguration(): ReadinessResult {
    return {
      readiness: 'incompatible',
      message: 'This Agent uses a Hermes capability this runtime does not support',
      action: 'retry',
    };
  }

  private runtimeSummary(
    state: HermesRuntimeState,
    message = SAFE_RUNTIME_MESSAGES[state] ?? 'Hermes runtime status is unavailable',
    action?: HermesRuntimeAction | null,
  ): SharedAgentRuntime {
    const status = this.runtime.getStatus();
    return {
      state,
      message,
      action: state === 'ready' ? null : (action ?? status.action ?? 'retry'),
    };
  }

  private runtimeFailure(error: unknown): SharedAgentRuntime {
    if (isMethodUnsupported(error)) {
      return this.runtimeSummary(
        'incompatible',
        'This Hermes runtime does not support shared Agent discovery',
        'retry',
      );
    }

    const status = this.runtime.getStatus();
    if (status.state !== 'ready') return this.runtimeSummary(status.state);
    return this.runtimeSummary('unhealthy', 'Shared Agent discovery is temporarily unavailable', 'retry');
  }
}

function isMethodUnsupported(error: unknown): error is HermesGatewayRpcError {
  return error instanceof HermesGatewayRpcErrorClass && error.rpcCode === -32601;
}

function safeDisplayText(value: string | null | undefined, fallback: string): string {
  const normalized = stripControlCharacters(value ?? '')
    .trim()
    .slice(0, 500);
  if (!normalized || containsSensitiveConfiguration(normalized)) return fallback;
  return normalized;
}

function safeConfigurationLabel(value: string | null | undefined): string | null {
  const normalized = stripControlCharacters(value ?? '')
    .trim()
    .slice(0, 160);
  if (
    !normalized ||
    containsSensitiveConfiguration(normalized) ||
    normalized.includes('://') ||
    normalized.includes('=') ||
    normalized.includes('\\') ||
    normalized.startsWith('/') ||
    /^[A-Za-z]:[\\/]/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function isSafeProfileHandle(value: string): boolean {
  return !value.includes('/') && !value.includes('\\') && !value.includes('..');
}

function stripControlCharacters(value: string): string {
  return [...value]
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 31 && codePoint !== 127;
    })
    .join('');
}

function containsSensitiveConfiguration(value: string): boolean {
  return /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|credential|authorization|bearer)\s*[:=]/i.test(
    value,
  );
}
