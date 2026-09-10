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

  all<T>(entity: EntityConstructor<T>) {
    return (this.records.get(entity) ?? []) as T[];
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

function createService(em: FakeEntityManager) {
  return new OrganizationService(
    em as never,
    { record: vi.fn() } as never,
    { record: vi.fn() } as never,
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
      [UserOrmEntity, user({ accessStatus: AccessStatus.PENDING })],
    ] as Array<[EntityConstructor<unknown>, unknown]>;
    const em = new FakeEntityManager(records);
    const service = createService(em);

    await expect(service.acceptInvitation('member-id', token)).rejects.toThrow(
      'matching verified GitHub email',
    );
    expect(invitation.status).toBe(OrganizationInvitationStatus.PENDING);
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
