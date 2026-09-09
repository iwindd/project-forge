import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { apiSuccess } from '../../../common/http/api-response.js';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { ORGANIZATION_PERMISSIONS, OrganizationMemberRole } from '../domain/organization.js';
import { OrganizationService } from '../application/organization.service.js';
import { CreateOrganizationRoleUseCase } from '../application/use-cases/create-organization-role-use-case.js';
import { DeleteOrganizationRoleUseCase } from '../application/use-cases/delete-organization-role-use-case.js';
import { ListOrganizationRolesUseCase } from '../application/use-cases/list-organization-roles-use-case.js';
import { UpdateOrganizationRoleUseCase } from '../application/use-cases/update-organization-role-use-case.js';
import {
  createInvitationSchema,
  createOrganizationSchema,
  updateMemberRoleSchema,
  updateMemberNameSchema,
  updateMemberStatusSchema,
  updateOrganizationSchema,
  createOrganizationRoleSchema,
  updateOrganizationRoleSchema,
} from './dto/organization.schemas.js';
import { organizationListSchema } from './dto/organization-response.schemas.js';

@Controller('organizations')
@UseGuards(SessionGuard)
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationService,
    private readonly listOrganizationRoles: ListOrganizationRolesUseCase,
    private readonly createOrganizationRole: CreateOrganizationRoleUseCase,
    private readonly updateOrganizationRole: UpdateOrganizationRoleUseCase,
    private readonly deleteOrganizationRole: DeleteOrganizationRoleUseCase,
  ) {}

  @Get()
  async list(@Principal() principal: AuthenticatedPrincipal) {
    const organizations = await this.organizations.listForUser(principal.id);
    const data = organizations.map(({ organization, role }) => ({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        type: organization.type,
        role,
        status: organization.status,
        createdAt: organization.createdAt.toISOString(),
        updatedAt: organization.updatedAt.toISOString(),
      }));
    return apiSuccess(organizationListSchema.parse(data));
  }

  @Post()
  async create(@Principal() principal: AuthenticatedPrincipal, @Body() body: unknown) {
    const input = createOrganizationSchema.parse(body);
    const organization = await this.organizations.createShared(
      principal.id,
      input.name,
      input.slug,
    );
    return apiSuccess({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        type: organization.type,
      },
    });
  }

  @Get(':id/roles')
  async roles(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('id') organizationId: string,
  ) {
    return {
      data: await this.listOrganizationRoles.execute(principal.id, organizationId),
      availablePermissions: [{ key: ORGANIZATION_PERMISSIONS.MANAGE }],
    };
  }

  @Post(':id/roles')
  async createRole(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('id') organizationId: string,
    @Body() body: unknown,
  ) {
    const input = createOrganizationRoleSchema.parse(body);
    return {
      role: await this.createOrganizationRole.execute(principal.id, organizationId, input),
    };
  }

  @Patch(':id/roles/:roleId')
  async updateRole(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('id') organizationId: string,
    @Param('roleId') roleId: string,
    @Body() body: unknown,
  ) {
    const input = updateOrganizationRoleSchema.parse(body);
    return {
      role: await this.updateOrganizationRole.execute(principal.id, organizationId, roleId, input),
    };
  }

  @Delete(':id/roles/:roleId')
  async deleteRole(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('id') organizationId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.deleteOrganizationRole.execute(principal.id, organizationId, roleId);
  }

  @Get(':id/members')
  async members(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('id') organizationId: string,
    @Query() query: { search?: string; role?: string; roleId?: string; status?: string; page?: string; pageSize?: string; sortBy?: string; sortDirection?: string },
  ) {
    let data = await this.organizations.listMembers(principal.id, organizationId);
    const search = query.search?.trim().toLowerCase();
    if (search) data = data.filter((member) => `${member.name} ${member.email ?? ''}`.toLowerCase().includes(search));
    if (query.roleId && query.roleId !== 'all') {
      data = data.filter((member) => member.role.id === query.roleId);
    } else if (query.role && query.role !== 'all') {
      const roles = query.role === 'EDITOR'
        ? [OrganizationMemberRole.MEMBER]
        : query.role === 'ADMIN'
          ? [OrganizationMemberRole.ADMIN, OrganizationMemberRole.OWNER]
          : [query.role];
      data = data.filter((member) => member.role.legacyRole !== null && roles.includes(member.role.legacyRole));
    }
    if (query.status === 'active') data = data.filter((member) => member.isActive);
    if (query.status === 'inactive') data = data.filter((member) => !member.isActive);
    const direction = query.sortDirection === 'asc' ? 1 : -1;
    const sortBy = query.sortBy ?? 'createdAt';
    data.sort((a, b) => {
      const aValue = sortBy === 'role' ? a.role.name : a[sortBy as keyof typeof a];
      const bValue = sortBy === 'role' ? b.role.name : b[sortBy as keyof typeof b];
      return String(aValue ?? '').localeCompare(String(bValue ?? '')) * direction;
    });
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
      input,
    );
    return { membership };
  }

  @Get(':id/members/:userId')
  async member(
    @Principal() principal: AuthenticatedPrincipal,
    @Param('id') organizationId: string,
    @Param('userId') userId: string,
  ) {
    return apiSuccess({
      user: await this.organizations.getMember(principal.id, organizationId, userId),
    });
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
      { roleId: input.roleId, role: input.role },
    );
    return {
      invitation: {
        id: result.invitation.id,
        organizationId: result.invitation.organizationId,
        email: result.invitation.email,
        role: result.role,
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
