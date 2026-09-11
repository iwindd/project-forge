import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  ForbiddenError,
  InvalidInputError,
} from '../../../common/errors/application-error.js';
import {
  ORGANIZATION_PERMISSIONS,
  OrganizationInvitationStatus,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType,
} from '../domain/organization.js';
import { OrganizationInvitationOrmEntity } from '../infrastructure/persistence/organization-invitation.orm-entity.js';
import { OrganizationMemberOrmEntity } from '../infrastructure/persistence/organization-member.orm-entity.js';
import { OrganizationOrmEntity } from '../infrastructure/persistence/organization.orm-entity.js';
import { OrganizationRoleOrmEntity } from '../infrastructure/persistence/organization-role.orm-entity.js';
import { AccessStatus } from '../../users/domain/user.js';
import { UserOrmEntity } from '../../users/infrastructure/persistence/user.orm-entity.js';
import { ConnectionOrmEntity } from '../../auth/infrastructure/persistence/connection.orm-entity.js';
import { OrganizationService } from './organization.service.js';

type EntityConstructor<T> = new () => T;

class FakeEntityManager {
  private readonly records = new Map<EntityConstructor<unknown>, unknown[]>();
  readonly persisted: unknown[] = [];
  flushCount = 0;

  constructor(seed: Array<[EntityConstructor<unknown>, unknown]>) {
    for (const [entity, record] of seed) {
      this.records.set(entity, [...(this.records.get(entity) ?? []), record]);
    }
  }

  async findOne<T>(entity: EntityConstructor<T>, where: Record<string, unknown>) {
    return (this.records.get(entity) ?? []).find((record) => matches(record, where)) as T | undefined ?? null;
  }

  async find<T>(entity: EntityConstructor<T>, where: Record<string, unknown>) {
    return (this.records.get(entity) ?? []).filter((record) => matches(record, where)) as T[];
  }

  async count<T>(entity: EntityConstructor<T>, where: Record<string, unknown>) {
    return (this.records.get(entity) ?? []).filter((record) => matches(record, where)).length;
  }

  create<T>(entity: EntityConstructor<T>, data: Record<string, unknown>) {
    const record = Object.assign(new entity() as object, data) as T;
    this.records.set(entity, [...(this.records.get(entity) ?? []), record]);
    return record;
  }

  persist<T>(record: T) {
    this.persisted.push(record);
    return record;
  }

  remove(record: unknown) {
    for (const [entity, records] of this.records) {
      this.records.set(entity, records.filter((candidate) => candidate !== record));
    }
  }

  async flush() {
    this.flushCount += 1;
  }

  snapshot() {
    const records = new Map<EntityConstructor<unknown>, unknown[]>();
    const states = new Map<object, Record<string, unknown>>();
    for (const [entity, values] of this.records) {
      records.set(entity, [...values]);
      for (const value of values) states.set(value as object, cloneState(value as Record<string, unknown>));
    }
    return { records, states, persistedLength: this.persisted.length };
  }

  restore(snapshot: ReturnType<FakeEntityManager['snapshot']>) {
    for (const [record, state] of snapshot.states) Object.assign(record, state);
    this.records.clear();
    for (const [entity, values] of snapshot.records) this.records.set(entity, values);
    this.persisted.length = snapshot.persistedLength;
  }

  all<T>(entity: EntityConstructor<T>) {
    return (this.records.get(entity) ?? []) as T[];
  }
}

function cloneState(state: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(state).map(([key, value]) => [
      key,
      value instanceof Date ? new Date(value) : Array.isArray(value) ? [...value] : value,
    ]),
  );
}

class TransactionalFakeUnitOfWork {
  constructor(
    private readonly em: FakeEntityManager,
    private readonly auditEvents: unknown[],
  ) {}

  async run<T>(work: () => Promise<T>) {
    const snapshot = this.em.snapshot();
    const auditLength = this.auditEvents.length;
    try {
      return await work();
    } catch (error) {
      this.em.restore(snapshot);
      this.auditEvents.length = auditLength;
      throw error;
    }
  }
}

function matches(record: unknown, where: Record<string, unknown>) {
  return Object.entries(where).every(([key, expected]) => {
    const actual = (record as Record<string, unknown>)[key];
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      const operators = expected as Record<string, unknown>;
      if ('$in' in operators && !(operators.$in as unknown[]).includes(actual)) return false;
      if ('$ne' in operators && actual === operators.$ne) return false;
      return true;
    }
    return actual === expected;
  });
}

function organization(overrides: Partial<OrganizationOrmEntity> = {}) {
  return Object.assign(new OrganizationOrmEntity(), {
    id: 'organization-id',
    ownerId: 'owner-id',
    name: 'Organization',
    slug: 'organization',
    type: OrganizationType.SHARED,
    status: OrganizationStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

function role(overrides: Partial<OrganizationRoleOrmEntity> = {}) {
  return Object.assign(new OrganizationRoleOrmEntity(), {
    id: 'member-role-id',
    organizationId: 'organization-id',
    name: 'สมาชิก',
    permissions: [],
    isOwner: false,
    legacyRole: OrganizationMemberRole.MEMBER,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

function member(overrides: Partial<OrganizationMemberOrmEntity> = {}) {
  return Object.assign(new OrganizationMemberOrmEntity(), {
    id: 'membership-id',
    organizationId: 'organization-id',
    userId: 'member-id',
    role: OrganizationMemberRole.MEMBER,
    roleId: 'member-role-id',
    status: OrganizationMemberStatus.ACTIVE,
    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

function user(overrides: Partial<UserOrmEntity> = {}) {
  return Object.assign(new UserOrmEntity(), {
    id: 'member-id',
    githubUserId: 'github-member-id',
    githubLogin: 'member',
    name: 'Member',
    accessStatus: AccessStatus.APPROVED,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

function createService(em: FakeEntityManager, audit = { record: vi.fn() }) {
  return new OrganizationService(
    em as never,
    audit as never,
    { record: vi.fn() } as never,
    { run: vi.fn(async <T>(work: () => Promise<T>) => work()) } as never,
  );
}

function standardOrganizationRecords() {
  return [
    role({
      id: 'owner-role-id',
      name: 'เจ้าของ',
      permissions: [ORGANIZATION_PERMISSIONS.MANAGE],
      isOwner: true,
      legacyRole: OrganizationMemberRole.OWNER,
    }),
    role({
      id: 'admin-role-id',
      name: 'แอดมิน',
      permissions: [ORGANIZATION_PERMISSIONS.MANAGE],
      legacyRole: OrganizationMemberRole.ADMIN,
    }),
    role(),
  ];
}

describe('OrganizationService', () => {
  it('rolls back an organization update when the business audit fails', async () => {
    const org = organization();
    const em = new FakeEntityManager([[OrganizationOrmEntity, org], ...standardOrganizationRecords().map((item) => [OrganizationRoleOrmEntity, item] as const), [OrganizationMemberOrmEntity, member({ userId: 'owner-id', role: OrganizationMemberRole.OWNER, roleId: 'owner-role-id' })]] as Array<[EntityConstructor<unknown>, unknown]>);
    const events: unknown[] = [];
    const audit = { record: vi.fn(async (event: unknown) => { events.push(event); throw new Error('audit unavailable'); }) };
    const service = new OrganizationService(em as never, audit as never, { record: vi.fn() } as never, new TransactionalFakeUnitOfWork(em, events) as never);

    await expect(service.updateOrganization('owner-id', 'organization-id', 'Renamed')).rejects.toThrow('audit unavailable');
    expect(org.name).toBe('Organization');
    expect(events).toEqual([]);
  });

  it('rolls back a member mutation when the business audit fails', async () => {
    const target = member();
    const em = new FakeEntityManager([[OrganizationOrmEntity, organization()], ...standardOrganizationRecords().map((item) => [OrganizationRoleOrmEntity, item] as const), [OrganizationMemberOrmEntity, member({ userId: 'owner-id', role: OrganizationMemberRole.OWNER, roleId: 'owner-role-id' })], [OrganizationMemberOrmEntity, target], [UserOrmEntity, user()]] as Array<[EntityConstructor<unknown>, unknown]>);
    const events: unknown[] = [];
    const audit = { record: vi.fn(async (event: unknown) => { events.push(event); throw new Error('audit unavailable'); }) };
    const service = new OrganizationService(em as never, audit as never, { record: vi.fn() } as never, new TransactionalFakeUnitOfWork(em, events) as never);

    await expect(service.updateMemberStatus('owner-id', 'organization-id', 'member-id', false)).rejects.toThrow('audit unavailable');
    expect(target.status).toBe(OrganizationMemberStatus.ACTIVE);
    expect(events).toEqual([]);
  });

  it('rolls back a role mutation when persistence fails, including its business audit', async () => {
    const target = role({ id: 'custom-role-id', name: 'Custom role', legacyRole: null });
    const em = new FakeEntityManager([[OrganizationOrmEntity, organization()], ...standardOrganizationRecords().map((item) => [OrganizationRoleOrmEntity, item] as const), [OrganizationRoleOrmEntity, target], [OrganizationMemberOrmEntity, member({ userId: 'owner-id', role: OrganizationMemberRole.OWNER, roleId: 'owner-role-id' })]] as Array<[EntityConstructor<unknown>, unknown]>);
    const events: unknown[] = [];
    const audit = { record: vi.fn(async (event: unknown) => { events.push(event); }) };
    const service = new OrganizationService(em as never, audit as never, { record: vi.fn() } as never, new TransactionalFakeUnitOfWork(em, events) as never);
    em.flush = vi.fn(async () => { throw new Error('persistence unavailable'); });

    await expect(service.updateRole('owner-id', 'organization-id', 'custom-role-id', { name: 'Reviewer' })).rejects.toThrow('persistence unavailable');
    expect(target.name).toBe('Custom role');
    expect(events).toEqual([]);
  });

  it('rolls back an invitation mutation when persistence fails, including its business audit', async () => {
    const invitation = Object.assign(new OrganizationInvitationOrmEntity(), { id: 'invitation-id', organizationId: 'organization-id', invitedBy: 'owner-id', email: 'person@example.com', tokenHash: 'token-hash', role: OrganizationMemberRole.MEMBER, roleId: 'member-role-id', status: OrganizationInvitationStatus.PENDING, expiresAt: new Date('2026-01-08T00:00:00.000Z'), acceptedBy: null, acceptedAt: null, createdAt: new Date('2026-01-01T00:00:00.000Z') });
    const em = new FakeEntityManager([[OrganizationOrmEntity, organization()], ...standardOrganizationRecords().map((item) => [OrganizationRoleOrmEntity, item] as const), [OrganizationMemberOrmEntity, member({ userId: 'owner-id', role: OrganizationMemberRole.OWNER, roleId: 'owner-role-id' })], [OrganizationInvitationOrmEntity, invitation]] as Array<[EntityConstructor<unknown>, unknown]>);
    const events: unknown[] = [];
    const audit = { record: vi.fn(async (event: unknown) => { events.push(event); }) };
    const service = new OrganizationService(em as never, audit as never, { record: vi.fn() } as never, new TransactionalFakeUnitOfWork(em, events) as never);
    em.flush = vi.fn(async () => { throw new Error('persistence unavailable'); });

    await expect(service.cancelInvitation('owner-id', 'organization-id', 'invitation-id')).rejects.toThrow('persistence unavailable');
    expect(invitation.status).toBe(OrganizationInvitationStatus.PENDING);
    expect(events).toEqual([]);
  });
  it('propagates the API request ID to organization update audit events', async () => {
    const org = organization();
    const records = [
      [OrganizationOrmEntity, org],
      ...standardOrganizationRecords().map((item) => [OrganizationRoleOrmEntity, item] as const),
      [OrganizationMemberOrmEntity, member({ userId: 'owner-id', role: OrganizationMemberRole.OWNER, roleId: 'owner-role-id' })],
    ] as Array<[EntityConstructor<unknown>, unknown]>;
    const audit = { record: vi.fn() };
    const service = createService(new FakeEntityManager(records), audit);

    await service.updateOrganization('owner-id', 'organization-id', 'Renamed', { requestId: 'request-id' });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ORGANIZATION_UPDATED', requestId: 'request-id' }),
    );
  });

  it('creates shared organizations with Thai built-in roles and one Owner membership', async () => {
    const em = new FakeEntityManager([]);
    const service = createService(em);

    const created = await service.createShared('owner-id', '  Acme  ');

    expect(created.name).toBe('Acme');
    expect(em.all(OrganizationRoleOrmEntity).map((item) => item.name)).toEqual([
      'เจ้าของ',
      'แอดมิน',
      'สมาชิก',
    ]);
    expect(em.all(OrganizationMemberOrmEntity)).toHaveLength(1);
    expect(em.all(OrganizationMemberOrmEntity)[0]).toMatchObject({
      userId: 'owner-id',
      role: OrganizationMemberRole.OWNER,
      roleId: em.all(OrganizationRoleOrmEntity)[0]?.id,
    });
  });

  it('blocks built-in role changes and every Owner membership mutation', async () => {
    const org = organization();
    const ownerMember = member({
      id: 'owner-membership-id',
      userId: 'owner-id',
      role: OrganizationMemberRole.OWNER,
      roleId: 'owner-role-id',
    });
    const records = [
      [OrganizationOrmEntity, org],
      ...standardOrganizationRecords().map((item) => [OrganizationRoleOrmEntity, item] as const),
      [OrganizationMemberOrmEntity, ownerMember],
      [UserOrmEntity, user({ id: 'owner-id', githubLogin: 'owner', name: 'Owner' })],
    ] as Array<[EntityConstructor<unknown>, unknown]>;
    const em = new FakeEntityManager(records);
    const service = createService(em);

    await expect(
      service.updateRole('owner-id', 'organization-id', 'admin-role-id', {
        name: 'Renamed',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      service.updateMemberRole('owner-id', 'organization-id', 'owner-id', {
        roleId: 'member-role-id',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      service.updateMemberStatus('owner-id', 'organization-id', 'owner-id', false),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      service.removeMember('owner-id', 'organization-id', 'owner-id'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('does not allow assigning the Owner role to another member', async () => {
    const org = organization();
    const records = [
      [OrganizationOrmEntity, org],
      ...standardOrganizationRecords().map((item) => [OrganizationRoleOrmEntity, item] as const),
      [OrganizationMemberOrmEntity, member({ userId: 'owner-id', role: OrganizationMemberRole.OWNER, roleId: 'owner-role-id' })],
      [OrganizationMemberOrmEntity, member({ id: 'target-membership-id', userId: 'member-id' })],
      [UserOrmEntity, user()],
    ] as Array<[EntityConstructor<unknown>, unknown]>;
    const em = new FakeEntityManager(records);
    const service = createService(em);

    await expect(
      service.updateMemberRole('owner-id', 'organization-id', 'member-id', {
        roleId: 'owner-role-id',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('requires the project permission for non-owner project mutations', async () => {
    const org = organization();
    const records = [
      [OrganizationOrmEntity, org],
      ...standardOrganizationRecords().map((item) => [OrganizationRoleOrmEntity, item] as const),
      [OrganizationMemberOrmEntity, member({ userId: 'member-id', role: OrganizationMemberRole.MEMBER, roleId: 'member-role-id' })],
    ] as Array<[EntityConstructor<unknown>, unknown]>;
    const em = new FakeEntityManager(records);
    const service = createService(em);

    await expect(
      service.requireProjectManager('member-id', 'organization-id'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('defaults invitations to Member and rotates the pending invitation for the same email', async () => {
    const org = organization();
    const existingInvitation = Object.assign(new OrganizationInvitationOrmEntity(), {
      id: 'invitation-id',
      organizationId: 'organization-id',
      invitedBy: 'previous-owner-id',
      email: 'person@example.com',
      tokenHash: 'old-token-hash',
      role: OrganizationMemberRole.ADMIN,
      roleId: 'admin-role-id',
      status: OrganizationInvitationStatus.PENDING,
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
      acceptedBy: null,
      acceptedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const records = [
      [OrganizationOrmEntity, org],
      ...standardOrganizationRecords().map((item) => [OrganizationRoleOrmEntity, item] as const),
      [OrganizationMemberOrmEntity, member({ userId: 'owner-id', role: OrganizationMemberRole.OWNER, roleId: 'owner-role-id' })],
      [OrganizationInvitationOrmEntity, existingInvitation],
    ] as Array<[EntityConstructor<unknown>, unknown]>;
    const em = new FakeEntityManager(records);
    const service = createService(em);

    const result = await service.createInvitation('owner-id', 'organization-id', ' Person@Example.com ', {});

    expect(result.invitation.id).toBe('invitation-id');
    expect(result.invitation.email).toBe('person@example.com');
    expect(result.invitation.role).toBe(OrganizationMemberRole.MEMBER);
    expect(result.invitation.roleId).toBe('member-role-id');
    expect(result.invitation.tokenHash).not.toBe('old-token-hash');
    expect(result.invitation.expiresAt.getTime()).toBeGreaterThan(new Date('2026-01-02T00:00:00.000Z').getTime());
    expect(em.persisted).toContain(existingInvitation);
  });

  it('rejects custom roles and Owner roles for invitations', async () => {
    const org = organization();
    const records = [
      [OrganizationOrmEntity, org],
      ...standardOrganizationRecords().map((item) => [OrganizationRoleOrmEntity, item] as const),
      [OrganizationRoleOrmEntity, role({ id: 'custom-role-id', name: 'Reviewer', legacyRole: null })],
      [OrganizationMemberOrmEntity, member({ userId: 'owner-id', role: OrganizationMemberRole.OWNER, roleId: 'owner-role-id' })],
    ] as Array<[EntityConstructor<unknown>, unknown]>;
    const em = new FakeEntityManager(records);
    const service = createService(em);

    await expect(
      service.createInvitation('owner-id', 'organization-id', 'person@example.com', {
        roleId: 'custom-role-id',
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await expect(
      service.createInvitation('owner-id', 'organization-id', 'person@example.com', {
        role: OrganizationMemberRole.OWNER,
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it('cancels a pending invitation through organization management', async () => {
    const org = organization();
    const invitation = Object.assign(new OrganizationInvitationOrmEntity(), {
      id: 'invitation-id',
      organizationId: 'organization-id',
      invitedBy: 'owner-id',
      email: 'person@example.com',
      tokenHash: 'token-hash',
      role: OrganizationMemberRole.MEMBER,
      roleId: 'member-role-id',
      status: OrganizationInvitationStatus.PENDING,
      expiresAt: new Date('2026-01-08T00:00:00.000Z'),
      acceptedBy: null,
      acceptedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const records = [
      [OrganizationOrmEntity, org],
      ...standardOrganizationRecords().map((item) => [OrganizationRoleOrmEntity, item] as const),
      [OrganizationMemberOrmEntity, member({ userId: 'owner-id', role: OrganizationMemberRole.OWNER, roleId: 'owner-role-id' })],
      [OrganizationInvitationOrmEntity, invitation],
    ] as Array<[EntityConstructor<unknown>, unknown]>;
    const em = new FakeEntityManager(records);
    const service = createService(em);

    await expect(
      service.cancelInvitation('owner-id', 'organization-id', 'invitation-id'),
    ).resolves.toEqual({ ok: true });
    expect(invitation.status).toBe(OrganizationInvitationStatus.CANCELLED);
  });

  it('rejects invitation acceptance without a matching verified GitHub email', async () => {
    const org = organization();
    const token = 'invite-token';
    const invitation = Object.assign(new OrganizationInvitationOrmEntity(), {
      id: 'invitation-id',
      organizationId: 'organization-id',
      invitedBy: 'owner-id',
      email: 'person@example.com',
      tokenHash: createHash('sha256').update(token).digest('hex'),
      role: OrganizationMemberRole.MEMBER,
      roleId: 'member-role-id',
      status: OrganizationInvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 60_000),
      acceptedBy: null,
      acceptedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const records = [
      [OrganizationOrmEntity, org],
      ...standardOrganizationRecords().map((item) => [OrganizationRoleOrmEntity, item] as const),
      [OrganizationMemberOrmEntity, member({ userId: 'owner-id', role: OrganizationMemberRole.OWNER, roleId: 'owner-role-id' })],
      [OrganizationInvitationOrmEntity, invitation],
      [ConnectionOrmEntity, Object.assign(new ConnectionOrmEntity(), {
        userId: 'member-id',
        provider: 'GITHUB',
        providerEmail: 'person@example.com',
        providerEmailVerified: false,
      })],
      [UserOrmEntity, user({ accessStatus: AccessStatus.APPROVED })],
    ] as Array<[EntityConstructor<unknown>, unknown]>;
    const em = new FakeEntityManager(records);
    const service = createService(em);

    await expect(service.acceptInvitation('member-id', token)).rejects.toThrow(
      'matching verified GitHub email',
    );
    expect(invitation.status).toBe(OrganizationInvitationStatus.PENDING);
  });

  it('accepts an invitation when a verified secondary GitHub email matches', async () => {
    const org = organization();
    const token = 'secondary-email-token';
    const invitation = Object.assign(new OrganizationInvitationOrmEntity(), {
      id: 'invitation-id',
      organizationId: 'organization-id',
      invitedBy: 'owner-id',
      email: 'secondary@example.com',
      tokenHash: createHash('sha256').update(token).digest('hex'),
      role: OrganizationMemberRole.MEMBER,
      roleId: 'member-role-id',
      status: OrganizationInvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 60_000),
      acceptedBy: null,
      acceptedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const records = [
      [OrganizationOrmEntity, org],
      ...standardOrganizationRecords().map((item) => [OrganizationRoleOrmEntity, item] as const),
      [OrganizationMemberOrmEntity, member({ userId: 'owner-id', role: OrganizationMemberRole.OWNER, roleId: 'owner-role-id' })],
      [OrganizationInvitationOrmEntity, invitation],
      [ConnectionOrmEntity, Object.assign(new ConnectionOrmEntity(), {
        userId: 'member-id',
        provider: 'GITHUB',
        providerEmail: 'primary@example.com',
        providerEmailVerified: true,
        providerVerifiedEmails: ['primary@example.com', 'secondary@example.com'],
      })],
      [UserOrmEntity, user({ accessStatus: AccessStatus.APPROVED })],
    ] as Array<[EntityConstructor<unknown>, unknown]>;
    const em = new FakeEntityManager(records);
    const service = createService(em);

    await expect(service.acceptInvitation('member-id', token)).resolves.toBe(org);
    expect(invitation.status).toBe(OrganizationInvitationStatus.ACCEPTED);
    expect(em.all(OrganizationMemberOrmEntity)).toHaveLength(2);
  });

  it('does not let an active Owner accept an invitation that would replace the Owner role', async () => {
    const org = organization();
    const token = 'owner-invite-token';
    const invitation = Object.assign(new OrganizationInvitationOrmEntity(), {
      id: 'invitation-id',
      organizationId: 'organization-id',
      invitedBy: 'owner-id',
      email: 'owner@example.com',
      tokenHash: createHash('sha256').update(token).digest('hex'),
      role: OrganizationMemberRole.MEMBER,
      roleId: 'member-role-id',
      status: OrganizationInvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 60_000),
      acceptedBy: null,
      acceptedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const records = [
      [OrganizationOrmEntity, org],
      ...standardOrganizationRecords().map((item) => [OrganizationRoleOrmEntity, item] as const),
      [OrganizationMemberOrmEntity, member({ userId: 'owner-id', role: OrganizationMemberRole.OWNER, roleId: 'owner-role-id' })],
      [OrganizationInvitationOrmEntity, invitation],
      [ConnectionOrmEntity, Object.assign(new ConnectionOrmEntity(), {
        userId: 'owner-id',
        provider: 'GITHUB',
        providerEmail: 'owner@example.com',
        providerEmailVerified: true,
      })],
      [UserOrmEntity, user({ id: 'owner-id', githubLogin: 'owner', name: 'Owner' })],
    ] as Array<[EntityConstructor<unknown>, unknown]>;
    const em = new FakeEntityManager(records);
    const service = createService(em);

    await expect(service.acceptInvitation('owner-id', token)).rejects.toThrow(
      'organization owner cannot accept',
    );
    expect(invitation.status).toBe(OrganizationInvitationStatus.PENDING);
  });

  it('persists an expired invitation before rejecting acceptance', async () => {
    const org = organization();
    const token = 'expired-token';
    const invitation = Object.assign(new OrganizationInvitationOrmEntity(), {
      id: 'expired-invitation-id',
      organizationId: 'organization-id',
      invitedBy: 'owner-id',
      email: 'person@example.com',
      tokenHash: createHash('sha256').update(token).digest('hex'),
      role: OrganizationMemberRole.MEMBER,
      roleId: 'member-role-id',
      status: OrganizationInvitationStatus.PENDING,
      expiresAt: new Date('2026-01-01T00:00:00.000Z'),
      acceptedBy: null,
      acceptedAt: null,
      createdAt: new Date('2025-12-01T00:00:00.000Z'),
    });
    const records = [
      [OrganizationOrmEntity, org],
      [OrganizationInvitationOrmEntity, invitation],
    ] as Array<[EntityConstructor<unknown>, unknown]>;
    const em = new FakeEntityManager(records);
    const service = createService(em);

    await expect(service.acceptInvitation('member-id', token)).rejects.toThrow('Invitation has expired');
    expect(invitation.status).toBe(OrganizationInvitationStatus.EXPIRED);
    expect(em.flushCount).toBe(1);
  });
});
