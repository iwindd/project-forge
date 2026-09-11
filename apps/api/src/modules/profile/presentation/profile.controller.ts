import { Body, Controller, Delete, Get, Inject, Param, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { EntityManager } from '@mikro-orm/core';
import { z } from 'zod';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { SECURITY_LOGGER } from '../../../common/security/security-log.port.js';
import type { SecurityLogPort } from '../../../common/security/security-log.port.js';
import { UNIT_OF_WORK } from '../../../common/database/unit-of-work.port.js';
import type { UnitOfWork } from '../../../common/database/unit-of-work.port.js';
import { NotFoundError, ForbiddenError } from '../../../common/errors/application-error.js';
import {
  apiNullSuccessResponseSchema,
  apiSuccess,
} from '../../../common/http/api-response.js';
import { getRequestId } from '../../../common/http/request-context.js';
import { AUDIT_LOGGER } from '../../../common/audit/audit.port.js';
import type { AuditLogPort } from '../../../common/audit/audit.port.js';
import { ConnectionOrmEntity } from '../../auth/infrastructure/persistence/connection.orm-entity.js';
import type { ProfileConnectionRepository } from '../../auth/infrastructure/persistence/profile-connection.repository.js';
import { UserOrmEntity } from '../../users/infrastructure/persistence/user.orm-entity.js';
import { databaseUuidSchema } from '../../../common/http/database-uuid.schema.js';
import {
  profileConnectionsResponseSchema,
  profileResponseSchema,
  profileUpdateResponseSchema,
} from './dto/profile-response.schemas.js';

const connectionIdParamSchema = z.object({ id: databaseUuidSchema });

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(200).nullable().optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  timezone: z.string().trim().max(80).nullable().optional(),
});

@Controller()
@UseGuards(SessionGuard)
export class ProfileController {
  constructor(
    private readonly em: EntityManager,
    private readonly profileConnections: ProfileConnectionRepository,
    @Inject(SECURITY_LOGGER) private readonly security: SecurityLogPort,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  @Get('profile')
  async get(@Principal() principal: AuthenticatedPrincipal) {
    const user = await this.em.findOne(UserOrmEntity, { id: principal.id });
    if (!user) throw new NotFoundError('User was not found');
    const profile = await this.profileConnections.ensureProfile({
      userId: user.id,
      displayName: user.name,
      avatarUrl: user.avatarUrl,
    });
    const connections = await this.profileConnections.findConnections(user.id);
    return apiSuccess(profileResponseSchema.parse({
      profile: {
        id: user.id,
        displayName: profile.displayName ?? user.name ?? user.githubLogin,
        avatarUrl: profile.avatarUrl ?? user.avatarUrl,
        bio: profile.bio,
        timezone: profile.timezone,
        platformRole: user.role,
        accountStatus: user.accessStatus,
        createdAt: user.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      connections: connections.map((connection) => ({
        id: connection.id,
        provider: connection.provider,
        username: connection.providerUsername,
        email: connection.providerEmail,
        connectedAt: connection.connectedAt.toISOString(),
      })),
    }));
  }

  @Patch('profile')
  async update(
    @Principal() principal: AuthenticatedPrincipal,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const input = updateProfileSchema.parse(body);
    return this.unitOfWork.run(async () => {
      const existingProfile = await this.profileConnections.findProfile(principal.id);
      const before = existingProfile
        ? { displayName: existingProfile.displayName, bio: existingProfile.bio, timezone: existingProfile.timezone }
        : undefined;
      const profile = await this.profileConnections.updateProfile(principal.id, input);
      if (!profile) throw new NotFoundError('Profile was not found');
      const user = await this.em.findOne(UserOrmEntity, { id: principal.id });
      if (user && input.displayName !== undefined) {
        user.name = profile.displayName;
        user.updatedAt = new Date();
        this.em.persist(user);
      }
      await this.audit.record({
        actorId: principal.id,
        targetUserId: principal.id,
        action: 'PROFILE_UPDATED',
        resourceType: 'PROFILE',
        resourceId: principal.id,
        before,
        after: { displayName: profile.displayName, bio: profile.bio, timezone: profile.timezone },
        requestId: getRequestId(request),
      });
      return apiSuccess(profileUpdateResponseSchema.parse({
        profile: {
          id: principal.id,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          bio: profile.bio,
          timezone: profile.timezone,
          updatedAt: profile.updatedAt.toISOString(),
        },
      }));
    });
  }

  @Get('connections')
  async connections(@Principal() principal: AuthenticatedPrincipal) {
    const connections = await this.profileConnections.findConnections(principal.id);
    return apiSuccess(profileConnectionsResponseSchema.parse(connections.map((connection) => ({
        id: connection.id,
        provider: connection.provider,
        username: connection.providerUsername,
        email: connection.providerEmail,
        connectedAt: connection.connectedAt.toISOString(),
      }))));
  }

  @Delete('connections/:id')
  async disconnect(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Req() request: Request,
  ) {
    const { id } = connectionIdParamSchema.parse(rawParams);
    return this.unitOfWork.run(async () => {
      const connection = await this.em.findOne(ConnectionOrmEntity, { id, userId: principal.id });
      if (!connection) throw new NotFoundError('Connection was not found');
      const total = await this.em.count(ConnectionOrmEntity, { userId: principal.id });
      if (total <= 1) throw new ForbiddenError('You cannot remove your only sign-in connection');
      this.em.remove(connection);
      await this.audit.record({
        actorId: principal.id,
        targetUserId: principal.id,
        action: 'OAUTH_CONNECTION_REMOVED',
        resourceType: 'CONNECTION',
        resourceId: connection.id,
        before: { provider: connection.provider },
        requestId: getRequestId(request),
      });
      await this.security.record({
        organizationId: null,
        userId: principal.id,
        provider: connection.provider,
        event: 'OAUTH_CONNECTION_REMOVED',
      });
      return apiNullSuccessResponseSchema.parse(apiSuccess(null));
    });
  }
}
