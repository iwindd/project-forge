import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { HermesRuntimeState, HermesRuntimeStatus } from '../../domain/hermes-runtime.types.js';
import { HermesRuntimeService } from '../hermes-runtime.service.js';
import { ExternalServiceError } from '../../../../common/errors/application-error.js';

export type SharedAgentModelOption = {
  provider: string;
  name: string;
  models: string[];
};

export type SharedAgentToolsetOption = {
  name: string;
  label: string;
  description: string;
  toolCount: number;
};

export type SharedAgentRuntimeSummary = {
  state: HermesRuntimeState;
  message: string;
  action: HermesRuntimeStatus['action'];
};

export type SharedAgentOptions = {
  models: SharedAgentModelOption[];
  skills: string[];
  toolsets: SharedAgentToolsetOption[];
  runtime: SharedAgentRuntimeSummary;
  refreshedAt: string;
};

type HermesRuntimeReader = Pick<HermesRuntimeService, 'getStatus' | 'request'>;

const modelOptionsResponseSchema = z.object({
  providers: z.array(
    z.object({
      slug: z.string().min(1).max(160),
      name: z.string().optional().default(''),
      models: z.array(z.string()).default([]),
    }),
  ),
});

const profileListResponseSchema = z.object({
  profiles: z.array(
    z.object({
      name: z.string().min(1).max(160),
      is_default: z.boolean().optional().default(false),
    }),
  ),
});

const profileDescriptionSchema = z.object({
  skills: z.array(z.object({ name: z.string(), enabled: z.boolean().optional().default(true) })).default([]),
  toolsets: z
    .array(
      z.object({
        name: z.string(),
        label: z.string().optional().default(''),
        description: z.string().optional().default(''),
        tool_count: z.number().int().nonnegative().optional().default(0),
        enabled: z.boolean().optional().default(true),
      }),
    )
    .default([]),
});

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
export class GetSharedAgentOptionsUseCase {
  constructor(@Inject(HermesRuntimeService) private readonly runtime: HermesRuntimeReader) {}

  async execute(): Promise<SharedAgentOptions> {
    const models = await this.readModels();
    const profiles = await this.readProfiles();
    const sourceProfile = profiles.find((profile) => profile.is_default) ?? profiles[0];
    let skills: string[] = [];
    let toolsets: SharedAgentToolsetOption[] = [];

    if (sourceProfile) {
      try {
        const raw = await this.runtime.request('profiles.describe', { name: sourceProfile.name });
        const parsed = profileDescriptionSchema.safeParse(raw);
        if (parsed.success) {
          skills = uniqueSafeLabels(parsed.data.skills.filter((skill) => skill.enabled).map((skill) => skill.name));
          toolsets = uniqueToolsets(parsed.data.toolsets.filter((toolset) => toolset.enabled));
        }
      } catch {
        // A profile-scoped catalog is optional when the runtime has no readable source profile.
      }
    }

    const status = this.runtime.getStatus();
    return {
      models,
      skills,
      toolsets,
      runtime: {
        state: status.state,
        message: SAFE_RUNTIME_MESSAGES[status.state] ?? 'Hermes runtime status is unavailable',
        action: status.action,
      },
      refreshedAt: new Date().toISOString(),
    };
  }

  private async readModels(): Promise<SharedAgentModelOption[]> {
    let raw: unknown;
    try {
      raw = await this.runtime.request('model.options', {
        explicit_only: false,
        include_unconfigured: false,
        refresh: false,
      });
    } catch {
      throw new ExternalServiceError('Hermes model capabilities are unavailable');
    }
    const parsed = modelOptionsResponseSchema.safeParse(raw);
    if (!parsed.success) throw new ExternalServiceError('Hermes model capabilities are incompatible');

    return parsed.data.providers
      .map((provider) => ({
        provider: safeLabel(provider.slug),
        name: safeLabel(provider.name) || safeLabel(provider.slug),
        models: uniqueSafeLabels(provider.models),
      }))
      .filter((provider) => provider.provider && provider.models.length > 0)
      .map((provider) => ({
        provider: provider.provider,
        name: provider.name,
        models: provider.models,
      }));
  }

  private async readProfiles(): Promise<z.infer<typeof profileListResponseSchema>['profiles']> {
    let raw: unknown;
    try {
      raw = await this.runtime.request('profiles.list', { include_sessions: false });
    } catch {
      throw new ExternalServiceError('Hermes profile discovery is unavailable');
    }
    const parsed = profileListResponseSchema.safeParse(raw);
    if (!parsed.success) throw new ExternalServiceError('Hermes profile discovery is incompatible');
    return parsed.data.profiles;
  }
}

function uniqueSafeLabels(values: string[]): string[] {
  return [...new Set(values.map(safeLabel).filter(Boolean))];
}

function uniqueToolsets(
  values: Array<{ name: string; label: string; description: string; tool_count: number }>,
): SharedAgentToolsetOption[] {
  const seen = new Set<string>();
  return values.flatMap((toolset) => {
    const name = safeLabel(toolset.name);
    if (!name || seen.has(name)) return [];
    seen.add(name);
    return [
      {
        name,
        label: safeText(toolset.label, name),
        description: safeText(toolset.description, ''),
        toolCount: toolset.tool_count,
      },
    ];
  });
}

function safeLabel(value: string): string {
  const normalized = stripControlCharacters(value).trim().slice(0, 160);
  if (
    !normalized ||
    normalized.includes('://') ||
    normalized.includes('=') ||
    normalized.includes('\\') ||
    normalized.startsWith('/') ||
    /^[A-Za-z]:[\\/]/.test(normalized) ||
    /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|credential|authorization|bearer)\s*[:=]/i.test(
      normalized,
    )
  ) {
    return '';
  }
  return normalized;
}

function safeText(value: string, fallback: string): string {
  const normalized = stripControlCharacters(value).trim();
  if (
    !normalized ||
    normalized.includes('://') ||
    normalized.includes('\\') ||
    normalized.startsWith('/') ||
    /^[A-Za-z]:[\\/]/.test(normalized) ||
    /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|credential|authorization|bearer)\s*[:=]/i.test(
      normalized,
    )
  ) {
    return fallback;
  }
  return normalized.slice(0, 500);
}

function stripControlCharacters(value: string): string {
  return [...value]
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 31 && codePoint !== 127;
    })
    .join('');
}
