import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AUDIT_LOGGER } from '../../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../../common/audit/audit.port.js';
import { ConflictError, ExternalServiceError } from '../../../../common/errors/application-error.js';
import { HermesRuntimeService } from '../hermes-runtime.service.js';
import { ListSharedAgentsUseCase, type SharedLocalAgent } from './list-shared-agents-use-case.js';

const handleSchema = z
  .string()
  .trim()
  .min(1, 'Agent handle is required')
  .max(64, 'Agent handle must not exceed 64 characters')
  .regex(/^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/, 'Agent handle contains unsupported characters');

const uniqueStringList = (label: string) =>
  z
    .array(z.string().trim().min(1).max(160))
    .max(100, `${label} must not contain more than 100 entries`)
    .refine((items) => new Set(items).size === items.length, `${label} must not contain duplicates`);

const avatarSchema = z
  .string()
  .max(2_800_000, 'Avatar is too large')
  .regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/, 'Avatar must be a PNG, JPEG, or WebP data URL')
  .nullable();

export const createSharedAgentInputSchema = z
  .object({
    handle: handleSchema,
    displayName: z.string().trim().min(1, 'Display name is required').max(160),
    description: z.string().trim().max(500),
    role: z.string().trim().min(1, 'Role is required').max(160),
    personality: z.string().trim().min(1, 'Personality is required').max(12_000),
    provider: z.string().trim().min(1).max(160),
    model: z.string().trim().min(1).max(160),
    skills: uniqueStringList('Skills'),
    toolsets: uniqueStringList('Toolsets'),
    confirmExpensiveModel: z.boolean().default(false),
    avatar: avatarSchema,
  })
  .strict();

export type CreateSharedAgentInput = z.infer<typeof createSharedAgentInputSchema>;

type HermesRuntimeReader = Pick<HermesRuntimeService, 'getStatus' | 'request'>;

type AgentSectionStatus = 'applied' | 'failed' | 'skipped';

type AgentSection = {
  status: AgentSectionStatus;
  message?: string;
};

export type CreateSharedAgentResult = {
  handle: string;
  status: 'ready' | 'incomplete';
  agent: SharedLocalAgent | null;
  sections: {
    identity: AgentSection;
    role: AgentSection;
    personality: AgentSection;
    model: AgentSection;
    skills: AgentSection;
    toolsets: AgentSection;
    avatar: AgentSection;
    readback: AgentSection;
    runtime: AgentSection;
    audit: AgentSection;
  };
  requiresConfirmation: boolean;
  refreshedAt: string;
};

const modelOptionsResponseSchema = z.object({
  providers: z.array(
    z.object({
      slug: z.string().min(1).max(160),
      models: z.array(z.string().min(1).max(160)).default([]),
    }),
  ),
});

const profileListResponseSchema = z.object({
  profiles: z.array(
    z.object({
      name: z.string().min(1).max(160),
      model: z.string().nullable().optional().default(null),
      provider: z.string().nullable().optional().default(null),
      description: z.string().optional().default(''),
      display_name: z.string().optional().default(''),
      has_avatar: z.boolean().optional().default(false),
      ui_meta: z
        .record(z.string(), z.unknown())
        .nullable()
        .optional()
        .transform((value) => value ?? {}),
    }),
  ),
});

const profileDescriptionSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().optional().default(''),
  soul: z.string().optional().default(''),
  model: z
    .object({ provider: z.string().optional().default(''), default: z.string().optional().default('') })
    .optional()
    .default({ provider: '', default: '' }),
  skills: z
    .array(z.object({ name: z.string().min(1).max(160), enabled: z.boolean().optional().default(true) }))
    .default([]),
  toolsets: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        enabled: z.boolean().optional().default(true),
      }),
    )
    .default([]),
});

const configureResponseSchema = z.object({
  ok: z.boolean(),
  applied: z
    .object({
      ui_meta: z.boolean().optional(),
      soul: z.boolean().optional(),
      description: z.boolean().optional(),
      model: z.boolean().optional(),
      skills: z.boolean().optional(),
      toolsets: z.boolean().optional(),
    })
    .default({}),
  confirm_required: z.boolean().optional().default(false),
});

const safeStatusMessage = 'Hermes did not apply this configuration section';
const readbackFailureMessage = 'Hermes Agent read-back did not match the submitted configuration';
const runtimeFailureMessage = 'The configured Agent is not ready on the managed Hermes runtime';

@Injectable()
export class CreateSharedAgentUseCase {
  constructor(
    @Inject(HermesRuntimeService) private readonly runtime: HermesRuntimeReader,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    private readonly listSharedAgents: ListSharedAgentsUseCase,
  ) {}

  async execute(input: {
    input: CreateSharedAgentInput;
    actorId: string;
    requestId: string;
  }): Promise<CreateSharedAgentResult> {
    const requested = createSharedAgentInputSchema.parse(input.input);
    const fingerprint = createConfigurationFingerprint(requested);
    const refreshedAt = new Date().toISOString();
    const sections = this.newSections();
    let createdNow = false;
    let auditFailed = false;
    let requiresConfirmation = false;
    let existingProfile = await this.findExistingProfile(requested.handle);

    await this.validateModel(requested);

    if (existingProfile) {
      const storedFingerprint = existingProfile.ui_meta?.project_forge_fingerprint;
      if (typeof storedFingerprint === 'string' && storedFingerprint !== fingerprint) {
        throw new ConflictError('A Shared Local Agent with this handle already exists', {
          field: 'handle',
          handle: requested.handle,
        });
      }
      const existingDescription = await this.describeProfile(requested.handle);
      if (!this.matchesExistingProfile(existingProfile, existingDescription, requested, fingerprint)) {
        throw new ConflictError('A Shared Local Agent with this handle already exists', {
          field: 'handle',
          handle: requested.handle,
        });
      }
    } else {
      try {
        await this.runtime.request('profiles.create', {
          name: requested.handle,
          description: requested.description,
          soul: requested.personality,
          model: requested.model,
          provider: requested.provider,
          mirror_credentials: true,
          clone_channels: false,
          no_alias: true,
        });
        createdNow = true;
        sections.identity = { status: 'applied' };
      } catch {
        existingProfile = await this.findExistingProfile(requested.handle);
        if (!existingProfile) {
          throw new ExternalServiceError('Hermes could not create the Shared Local Agent');
        }
        const existingDescription = await this.describeProfile(requested.handle);
        if (!this.matchesExistingProfile(existingProfile, existingDescription, requested, fingerprint)) {
          throw new ConflictError('A Shared Local Agent with this handle already exists', {
            field: 'handle',
            handle: requested.handle,
          });
        }
      }
    }

    if (!createdNow) sections.identity = { status: 'applied' };

    if (createdNow) {
      const createdAudit = await this.recordAudit({
        actorId: input.actorId,
        requestId: input.requestId,
        action: 'SHARED_AGENT_CREATED',
        resourceId: requested.handle,
        after: this.safeAuditMetadata(requested),
      });
      auditFailed = !createdAudit;
      sections.audit = createdAudit
        ? { status: 'applied' }
        : { status: 'failed', message: 'Audit history could not be recorded' };
    }

    let describedProfile: z.infer<typeof profileDescriptionSchema> | null = null;
    try {
      describedProfile = await this.describeProfile(requested.handle);
      const unsupportedSkills = requested.skills.filter(
        (skill) => !describedProfile?.skills.some((candidate) => candidate.name === skill),
      );
      const unsupportedToolsets = requested.toolsets.filter(
        (toolset) => !describedProfile?.toolsets.some((candidate) => candidate.name === toolset),
      );
      if (unsupportedSkills.length > 0 || unsupportedToolsets.length > 0) {
        throw new ConflictError('The submitted Agent capabilities are stale', {
          ...(unsupportedSkills.length > 0 ? { skills: unsupportedSkills } : {}),
          ...(unsupportedToolsets.length > 0 ? { toolsets: unsupportedToolsets } : {}),
        });
      }

      const disabledSkills = describedProfile.skills
        .map((skill) => skill.name)
        .filter((skill) => !requested.skills.includes(skill));
      const configureResult = await this.configureProfile(requested, disabledSkills, fingerprint);
      requiresConfirmation = configureResult.confirm_required;
      this.applyConfigureSections(sections, configureResult);
    } catch (error) {
      if (error instanceof ConflictError) throw error;
      this.markConfigurationFailed(sections);
    }

    if (requested.avatar) {
      try {
        const result = await this.runtime.request<unknown>('profiles.set_asset', {
          name: requested.handle,
          asset: 'avatar',
          data: requested.avatar,
        });
        sections.avatar = isSuccessfulAssetResult(result)
          ? { status: 'applied' }
          : { status: 'failed', message: safeStatusMessage };
      } catch {
        sections.avatar = { status: 'failed', message: safeStatusMessage };
      }
    } else {
      sections.avatar = { status: 'skipped' };
    }

    try {
      const readback = await this.describeProfile(requested.handle);
      const profileRows = await this.findExistingProfile(requested.handle);
      if (this.matchesReadback(profileRows, readback, requested)) {
        sections.readback = { status: 'applied' };
      } else {
        sections.readback = { status: 'failed', message: readbackFailureMessage };
        this.markReadbackRelatedSectionsFailed(sections, readback, requested);
      }
    } catch {
      sections.readback = { status: 'failed', message: readbackFailureMessage };
    }

    let agent: SharedLocalAgent | null = null;
    try {
      const roster = await this.listSharedAgents.execute({ canConfigure: true });
      agent = roster.agents.find((candidate) => candidate.handle === requested.handle) ?? null;
      sections.runtime =
        agent?.readiness === 'ready' ? { status: 'applied' } : { status: 'failed', message: runtimeFailureMessage };
    } catch {
      sections.runtime = { status: 'failed', message: runtimeFailureMessage };
    }

    const configurationStatus = this.isComplete(sections, agent) ? 'ready' : 'incomplete';
    const configuredAudit = await this.recordAudit({
      actorId: input.actorId,
      requestId: input.requestId,
      action: 'SHARED_AGENT_CONFIGURED',
      resourceId: requested.handle,
      after: {
        handle: requested.handle,
        status: configurationStatus,
        sections: Object.fromEntries(Object.entries(sections).map(([name, section]) => [name, section.status])),
      },
    });
    sections.audit =
      configuredAudit && !auditFailed
        ? { status: 'applied' }
        : { status: 'failed', message: 'Audit history could not be recorded' };

    const status = this.isComplete(sections, agent) ? 'ready' : 'incomplete';
    return {
      handle: requested.handle,
      status,
      agent,
      sections,
      requiresConfirmation,
      refreshedAt,
    };
  }

  private newSections(): CreateSharedAgentResult['sections'] {
    return {
      identity: { status: 'failed', message: 'Hermes Agent creation has not completed' },
      role: { status: 'failed', message: safeStatusMessage },
      personality: { status: 'failed', message: safeStatusMessage },
      model: { status: 'failed', message: safeStatusMessage },
      skills: { status: 'failed', message: safeStatusMessage },
      toolsets: { status: 'failed', message: safeStatusMessage },
      avatar: { status: 'skipped' },
      readback: { status: 'failed', message: readbackFailureMessage },
      runtime: { status: 'failed', message: runtimeFailureMessage },
      audit: { status: 'applied' },
    };
  }

  private async validateModel(input: CreateSharedAgentInput): Promise<void> {
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
    const provider = parsed.success
      ? parsed.data.providers.find((candidate) => candidate.slug === input.provider)
      : null;
    if (!parsed.success || !provider?.models.includes(input.model)) {
      throw new ConflictError('The selected Provider and model are not available on the managed Hermes runtime', {
        field: 'model',
      });
    }
  }

  private async findExistingProfile(
    handle: string,
  ): Promise<z.infer<typeof profileListResponseSchema>['profiles'][number] | null> {
    let raw: unknown;
    try {
      raw = await this.runtime.request('profiles.list', { include_sessions: false });
    } catch {
      throw new ExternalServiceError('Hermes profile discovery is unavailable');
    }
    const parsed = profileListResponseSchema.safeParse(raw);
    if (!parsed.success) throw new ExternalServiceError('Hermes profile discovery is incompatible');
    return parsed.data.profiles.find((profile) => profile.name === handle) ?? null;
  }

  private async describeProfile(handle: string): Promise<z.infer<typeof profileDescriptionSchema>> {
    let raw: unknown;
    try {
      raw = await this.runtime.request('profiles.describe', { name: handle });
    } catch {
      throw new ExternalServiceError('Hermes could not read the Shared Local Agent configuration');
    }
    const parsed = profileDescriptionSchema.safeParse(raw);
    if (!parsed.success) throw new ExternalServiceError('Hermes returned an incompatible Agent configuration');
    return parsed.data;
  }

  private async configureProfile(
    input: CreateSharedAgentInput,
    disabledSkills: string[],
    fingerprint: string,
  ): Promise<z.infer<typeof configureResponseSchema>> {
    let raw: unknown;
    try {
      raw = await this.runtime.request('profiles.configure', {
        name: input.handle,
        ui_meta: {
          display_name: input.displayName,
          role: input.role,
          project_forge_fingerprint: fingerprint,
        },
        soul: input.personality,
        description: input.description,
        model: input.model,
        provider: input.provider,
        confirm_expensive_model: input.confirmExpensiveModel,
        disabled_skills: disabledSkills,
        enabled_toolsets: input.toolsets,
      });
    } catch {
      return { ok: false, applied: {}, confirm_required: false };
    }
    const parsed = configureResponseSchema.safeParse(raw);
    return parsed.success ? parsed.data : { ok: false, applied: {}, confirm_required: false };
  }

  private applyConfigureSections(
    sections: CreateSharedAgentResult['sections'],
    result: z.infer<typeof configureResponseSchema>,
  ): void {
    sections.role = this.sectionFromApplied(result.applied.ui_meta);
    sections.personality = this.sectionFromApplied(result.applied.soul);
    sections.model = result.confirm_required
      ? { status: 'failed', message: 'Hermes requires confirmation for the selected model' }
      : this.sectionFromApplied(result.applied.model);
    sections.skills = this.sectionFromApplied(result.applied.skills);
    sections.toolsets = this.sectionFromApplied(result.applied.toolsets);
    if (result.applied.description === false) {
      sections.identity = { status: 'failed', message: safeStatusMessage };
    }
  }

  private sectionFromApplied(applied: boolean | undefined): AgentSection {
    return applied === true ? { status: 'applied' } : { status: 'failed', message: safeStatusMessage };
  }

  private markConfigurationFailed(sections: CreateSharedAgentResult['sections']): void {
    sections.role = { status: 'failed', message: safeStatusMessage };
    sections.personality = { status: 'failed', message: safeStatusMessage };
    sections.model = { status: 'failed', message: safeStatusMessage };
    sections.skills = { status: 'failed', message: safeStatusMessage };
    sections.toolsets = { status: 'failed', message: safeStatusMessage };
  }

  private matchesExistingProfile(
    profile: z.infer<typeof profileListResponseSchema>['profiles'][number],
    described: z.infer<typeof profileDescriptionSchema>,
    input: CreateSharedAgentInput,
    fingerprint: string,
  ): boolean {
    const storedFingerprint = profile.ui_meta?.project_forge_fingerprint;
    if (typeof storedFingerprint === 'string') return storedFingerprint === fingerprint;
    if (input.avatar !== null) return false;
    return this.matchesReadback(profile, described, input);
  }

  private matchesReadback(
    profile: z.infer<typeof profileListResponseSchema>['profiles'][number] | null,
    described: z.infer<typeof profileDescriptionSchema>,
    input: CreateSharedAgentInput,
  ): boolean {
    const enabledSkills = described.skills
      .filter((skill) => skill.enabled)
      .map((skill) => skill.name)
      .sort();
    const enabledToolsets = described.toolsets
      .filter((toolset) => toolset.enabled)
      .map((toolset) => toolset.name)
      .sort();
    const expectedSkills = [...input.skills].sort();
    const expectedToolsets = [...input.toolsets].sort();
    const role = profile?.ui_meta?.role;
    const displayName = profile?.display_name;
    return (
      described.name === input.handle &&
      described.description === input.description &&
      described.soul === input.personality &&
      described.model.provider === input.provider &&
      described.model.default === input.model &&
      JSON.stringify(enabledSkills) === JSON.stringify(expectedSkills) &&
      JSON.stringify(enabledToolsets) === JSON.stringify(expectedToolsets) &&
      (input.avatar === null || profile?.has_avatar === true) &&
      (displayName === undefined || displayName === input.displayName) &&
      (role === undefined || role === input.role)
    );
  }

  private markReadbackRelatedSectionsFailed(
    sections: CreateSharedAgentResult['sections'],
    described: z.infer<typeof profileDescriptionSchema>,
    input: CreateSharedAgentInput,
  ): void {
    if (described.description !== input.description)
      sections.identity = { status: 'failed', message: readbackFailureMessage };
    if (described.soul !== input.personality)
      sections.personality = { status: 'failed', message: readbackFailureMessage };
    if (described.model.provider !== input.provider || described.model.default !== input.model) {
      sections.model = { status: 'failed', message: readbackFailureMessage };
    }
  }

  private isComplete(sections: CreateSharedAgentResult['sections'], agent: SharedLocalAgent | null): boolean {
    return agent?.readiness === 'ready' && Object.values(sections).every((section) => section.status !== 'failed');
  }

  private async recordAudit(input: {
    actorId: string;
    requestId: string;
    action: string;
    resourceId: string;
    after: Record<string, unknown>;
  }): Promise<boolean> {
    try {
      await this.audit.record({
        actorId: input.actorId,
        action: input.action,
        resourceType: 'SHARED_LOCAL_AGENT',
        resourceId: input.resourceId,
        after: input.after,
        requestId: input.requestId,
      });
      return true;
    } catch {
      return false;
    }
  }

  private safeAuditMetadata(input: CreateSharedAgentInput): Record<string, unknown> {
    return {
      handle: input.handle,
      displayName: input.displayName,
      role: input.role,
      provider: input.provider,
      model: input.model,
      hasAvatar: input.avatar !== null,
      skillCount: input.skills.length,
      toolsetCount: input.toolsets.length,
    };
  }
}

export function createConfigurationFingerprint(input: CreateSharedAgentInput): string {
  const avatarHash = input.avatar ? createHash('sha256').update(input.avatar).digest('hex') : null;
  return createHash('sha256')
    .update(
      JSON.stringify({
        handle: input.handle,
        displayName: input.displayName,
        description: input.description,
        role: input.role,
        personality: input.personality,
        provider: input.provider,
        model: input.model,
        avatar: avatarHash,
        skills: [...input.skills].sort(),
        toolsets: [...input.toolsets].sort(),
      }),
    )
    .digest('hex');
}

function isSuccessfulAssetResult(value: unknown): boolean {
  return z.object({ ok: z.literal(true) }).safeParse(value).success;
}
