import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { OrganizationMemberRole } from '../domain/organization.js';
import { OrganizationService } from '../application/organization.service.js';
import { getCookie } from '../../../common/http/request-context.js';
import { SESSION_REPOSITORY } from '../../auth/application/ports/session.repository.js';
import type { SessionRepository } from '../../auth/application/ports/session.repository.js';
import {
  createInvitationSchema,
  createOrganizationSchema,
  updateMemberRoleSchema,
  updateMemberNameSchema,
  updateMemberStatusSchema,
  updateOrganizationSchema,
} from './dto/organization.schemas.js';

@Controller('organizations')
@UseGuards(SessionGuard)
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationService,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  @Get()
  async list(@Principal() principal: AuthenticatedPrincipal) {
    const organizations = await this.organizations.listForUser(principal.id);
    return {
      data: organizations.map(({ organization, membership }) => ({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        type: organization.type,
        role: membership.role,
        status: organization.status,
        createdAt: organization.createdAt.toISOString(),
        updatedAt: organization.updatedAt.toISOString(),
      })),
    };
  }

  @Post()
  async create(@Principal() principal: AuthenticatedPrincipal, @Body() body: unknown) {
    const input = createOrganizationSchema.parse(body);
    const organization = await this.organizations.createShared(
      principal.id,
      input.name,
      input.slug,
    );
    return { organization };
  }

  @Get(':id/members')
  async members(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('id') organizationId: string,
    @Query() query: { search?: string; role?: string; status?: string; page?: string; pageSize?: string; sortBy?: string; sortDirection?: string },
  ) {
    let data = await this.organizations.listMembers(principal.id, organizationId);
    const search = query.search?.trim().toLowerCase();
    if (search) data = data.filter((member) => `${member.name} ${member.email ?? ''}`.toLowerCase().includes(search));
    if (query.role && query.role !== 'all') {
      const roles = query.role === 'EDITOR'
        ? [OrganizationMemberRole.MEMBER]
        : query.role === 'ADMIN'
          ? [OrganizationMemberRole.ADMIN, OrganizationMemberRole.OWNER]
          : [query.role];
      data = data.filter((member) => roles.includes(member.role));
    }
    if (query.status === 'active') data = data.filter((member) => member.isActive);
    if (query.status === 'inactive') data = data.filter((member) => !member.isActive);
    const direction = query.sortDirection === 'asc' ? 1 : -1;
    const sortBy = query.sortBy ?? 'createdAt';
    data.sort((a, b) => String(a[sortBy as keyof typeof a] ?? '').localeCompare(String(b[sortBy as keyof typeof b] ?? '')) * direction);
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 5), 100);
    const total = data.length;
    return { data: data.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize };
  }

  @Patch(':id')
  async update(@Principal() principal: AuthenticatedPrincipal, @Param('id') organizationId: string, @Body() body: unknown) {
    const input = updateOrganizationSchema.parse(body);
    if (input.name === undefined) {
      const { organization } = await this.organizations.requireManager(principal.id, organizationId);
      return { organization };
    }
    return { organization: await this.organizations.updateOrganization(principal.id, organizationId, input.name) };
  }

  @Post(':id/switch')
  async switch(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('id') organizationId: string,
    @Req() request: Request,
  ) {
    const { organization, membership } = await this.organizations.requireMembership(principal.id, organizationId);
    const token = getCookie(request, 'pf_session');
    if (token) await this.sessions.setActiveOrganization(this.organizations.hashToken(token), organizationId);
    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        type: organization.type,
        role: membership.role,
      },
    };
  }

  @Patch(':id/members/:userId')
  async updateMember(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('id') organizationId: string,
    @Param('userId') userId: string,
    @Body() body: unknown,
  ) {
    const input = updateMemberRoleSchema.parse(body);
    const membership = await this.organizations.updateMemberRole(
      principal.id,
      organizationId,
      userId,
      input.role as OrganizationMemberRole,
    );
    return { membership };
  }

  @Get(':id/members/:userId')
  async member(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('id') organizationId: string,
    @Param('userId') userId: string,
  ) {
    return { user: await this.organizations.getMember(principal.id, organizationId, userId) };
  }

  @Patch(':id/members/:userId/name')
  async memberName(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('id') organizationId: string,
    @Param('userId') userId: string,
    @Body() body: unknown,
  ) {
    const input = updateMemberNameSchema.parse(body);
    return { user: await this.organizations.updateMemberName(principal.id, organizationId, userId, input.name) };
  }

  @Patch(':id/members/:userId/status')
  async memberStatus(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('id') organizationId: string,
    @Param('userId') userId: string,
    @Body() body: unknown,
  ) {
    const input = updateMemberStatusSchema.parse(body);
    return { user: await this.organizations.updateMemberStatus(principal.id, organizationId, userId, input.active) };
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('id') organizationId: string,
    @Param('userId') userId: string,
  ) {
    await this.organizations.removeMember(principal.id, organizationId, userId);
    return { ok: true };
  }

  @Post(':id/invitations')
  async invite(@Principal() principal: AuthenticatedPrincipal, @Param('id') organizationId: string, @Body() body: unknown) {
    const input = createInvitationSchema.parse(body);
    const result = await this.organizations.createInvitation(
      principal.id,
      organizationId,
      input.email ?? null,
      input.role as OrganizationMemberRole,
    );
    return {
      invitation: {
        id: result.invitation.id,
        organizationId: result.invitation.organizationId,
        email: result.invitation.email,
        role: result.invitation.role,
        status: result.invitation.status,
        expiresAt: result.invitation.expiresAt.toISOString(),
        createdAt: result.invitation.createdAt.toISOString(),
      },
      token: result.token,
    };
  }

  @Get(':id/invitations')
  async invitations(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('id') organizationId: string,
  ) {
    return { data: await this.organizations.listInvitations(principal.id, organizationId) };
  }

  @Post('invitations/:token/accept')
  async accept(@Principal() principal: AuthenticatedPrincipal, @Param('token') token: string) {
    const organization = await this.organizations.acceptInvitation(principal.id, token);
    return { organization };
  }
}
