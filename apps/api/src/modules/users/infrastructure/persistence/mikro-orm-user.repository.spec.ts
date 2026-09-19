import { describe, expect, it, vi } from 'vitest';
import { AccessStatus, UserRole, type UserRecord } from '../../domain/user.js';
import { MikroOrmUserRepository } from './mikro-orm-user.repository.js';

function user(overrides: Partial<UserRecord> = {}): UserRecord {
  const timestamp = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    githubUserId: 'github-user',
    githubLogin: 'github-login',
    name: 'GitHub User',
    avatarUrl: null,
    role: UserRole.USER,
    accessStatus: AccessStatus.APPROVED,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function setup(existing: unknown = null) {
  const em = {
    findOne: vi.fn(async () => existing),
    create: vi.fn(() => ({})),
    persist: vi.fn(),
    flush: vi.fn(async () => undefined),
  };
  const repository = new MikroOrmUserRepository(em as never);
  return { repository, em };
}

describe('MikroOrmUserRepository', () => {
  it('flushes a newly persisted user before dependent security records are written', async () => {
    const { repository, em } = setup();

    await repository.save(user());

    expect(em.persist).toHaveBeenCalledOnce();
    expect(em.flush).toHaveBeenCalledOnce();
  });

  it('flushes updates through the repository write boundary', async () => {
    const { repository, em } = setup({ id: user().id });

    await repository.save(user({ name: 'Renamed User' }));

    expect(em.persist).toHaveBeenCalledOnce();
    expect(em.flush).toHaveBeenCalledOnce();
  });
});
