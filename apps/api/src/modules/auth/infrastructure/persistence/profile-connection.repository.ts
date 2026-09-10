import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { ConnectionOrmEntity } from './connection.orm-entity.js';
import { ProfileOrmEntity } from '../../../users/infrastructure/persistence/profile.orm-entity.js';

@Injectable()
export class ProfileConnectionRepository {
  constructor(private readonly em: EntityManager) {}

  async ensureProfile(input: {
    userId: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  }) {
    let profile = await this.em.findOne(ProfileOrmEntity, { userId: input.userId });
    if (!profile) {
      profile = this.em.create(ProfileOrmEntity, {
        userId: input.userId,
        displayName: input.displayName ?? null,
        avatarUrl: input.avatarUrl ?? null,
      });
      this.em.persist(profile);
    } else {
      if (input.displayName !== undefined && !profile.displayName) profile.displayName = input.displayName;
      if (input.avatarUrl !== undefined && !profile.avatarUrl) profile.avatarUrl = input.avatarUrl;
    }
    return profile;
  }

  findProfile(userId: string) {
    return this.em.findOne(ProfileOrmEntity, { userId });
  }

  async updateProfile(userId: string, input: { displayName?: string | null; bio?: string | null; timezone?: string | null }) {
    const profile = await this.findProfile(userId);
    if (!profile) return null;
    if (input.displayName !== undefined) profile.displayName = input.displayName;
    if (input.bio !== undefined) profile.bio = input.bio;
    if (input.timezone !== undefined) profile.timezone = input.timezone;
    profile.updatedAt = new Date();
    this.em.persist(profile);
    await this.em.flush();
    return profile;
  }

  async upsertConnection(input: {
    userId: string;
    provider: string;
    providerAccountId: string;
    providerUsername?: string | null;
    providerEmail?: string | null;
    providerEmailVerified?: boolean;
    accessTokenCiphertext?: string | null;
    scopes?: string | null;
  }) {
    let connection = await this.em.findOne(ConnectionOrmEntity, {
      provider: input.provider,
      providerAccountId: input.providerAccountId,
    });
    if (!connection) {
      connection = this.em.create(ConnectionOrmEntity, {
        userId: input.userId,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
      });
    }
    connection.userId = input.userId;
    connection.providerUsername = input.providerUsername ?? connection.providerUsername;
    connection.providerEmail = input.providerEmail ?? connection.providerEmail;
    if (input.providerEmailVerified !== undefined) {
      connection.providerEmailVerified = input.providerEmailVerified;
    }
    connection.accessTokenCiphertext = input.accessTokenCiphertext ?? connection.accessTokenCiphertext;
    connection.scopes = input.scopes ?? connection.scopes;
    connection.updatedAt = new Date();
    this.em.persist(connection);
    return connection;
  }

  findConnections(userId: string) {
    return this.em.find(ConnectionOrmEntity, { userId }, { orderBy: { connectedAt: 'ASC' } });
  }
}
