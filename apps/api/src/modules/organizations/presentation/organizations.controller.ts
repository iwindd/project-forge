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
  invitationTokenParamSchema,
  organizationIdParamSchema,
  organizationMemberParamSchema,
  organizationMembersQuerySchema,
  organizationRoleParamSchema,
} from './dto/organization.schemas.js';
import {
  organizationInvitationListSchema,
  organizationListSchema,
  organizationMemberListSchema,
  organizationRoleListSchema,
} from './dto/organization-response.schemas.js';

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
    @Param() rawParams: unknown,
  ) {
    const { id: organizationId } = organizationIdParamSchema.parse(rawParams);
    const roles = organizationRoleListSchema.parse(
      await this.listOrganizationRoles.execute(principal.id, organizationId),
    );
    return apiSuccess(roles, {
      availablePermissions: [{ key: ORGANIZATION_PERMISSIONS.MANAGE }],
    });
  }

  @Post(':id/roles')
  async createRole(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Body() body: unknown,
  ) {
    const { id: organizationId } = organizationIdParamSchema.parse(rawParams);
    const input = createOrganizationRoleSchema.parse(body);
    return apiSuccess({
      role: await this.createOrganizationRole.execute(principal.id, organizationId, input),
    });
  }

  @Patch(':id/roles/:roleId')
  async updateRole(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Body() body: unknown,
  ) {
    const { id: organizationId, roleId } = organizationRoleParamSchema.parse(rawParams);
    const input = updateOrganizationRoleSchema.parse(body);
    return apiSuccess({
      role: await this.updateOrganizationRole.execute(principal.id, organizationId, roleId, input),
    });
  }

  @Delete(':id/roles/:roleId')
  async deleteRole(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
  ) {
    const { id: organizationId, roleId } = organizationRoleParamSchema.parse(rawParams);
    return apiSuccess(
      await this.deleteOrganizationRole.execute(principal.id, organizationId, roleId),
    );
  }

  @Get(':id/members')
  async members(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Query() rawQuery: unknown,
  ) {
    const { id: organizationId } = organizationIdParamSchema.parse(rawParams);
    const query = organizationMembersQuerySchema.parse(rawQuery);
    let data = organizationMemberListSchema.parse(
      await this.organizations.listMembers(principal.id, organizationId),
    );
    const search = query.search?.trim().toLowerCase();
    if (search) data = data.filter((member) => `${member.name} ${member.email ?? ''}`.toLowerCase().includes(search));
    if (query.roleId && query.roleId !== 'all') {
      data = data.filter((member) => member.role.id === query.roleId);
    } else if (query.role !== 'all') {
      const roles: string[] = query.role === 'EDITOR'
        ? [OrganizationMemberRole.MEMBER]
        : query.role === 'ADMIN'
          ? [OrganizationMemberRole.ADMIN, OrganizationMemberRole.OWNER]
          : query.role === 'OWNER'
            ? [OrganizationMemberRole.OWNER]
            : [OrganizationMemberRole.MEMBER];
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
    const page = query.page;
    const pageSize = query.pageSize;
    const total = data.length;
    return apiSuccess(data.slice((page - 1) * pageSize, page * pageSize), {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  }

  @Patch(':id')
  async update(@Principal() principal: AuthenticatedPrincipal, @Param() rawParams: unknown, @Body() body: unknown) {
    const { id: organizationId } = organizationIdParamSchema.parse(rawParams);
    const input = updateOrganizationSchema.parse(body);
    if (input.name === undefined) {
      const { organization } = await this.organizations.requireManager(principal.id, organizationId);
      return apiSuccess({ organization });
    }
    return apiSuccess({ organization: await this.organizations.updateOrganization(principal.id, organizationId, input.name) });
  }

  @Patch(':id/members/:userId')
  async updateMember(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Body() body: unknown,
  ) {
    const { id: organizationId, userId } = organizationMemberParamSchema.parse(rawParams);
    const input = updateMemberRoleSchema.parse(body);
    const membership = await this.organizations.updateMemberRole(
      principal.id,
      organizationId,
      userId,
      input,
    );
    return apiSuccess({ membership });
  }

  @Get(':id/members/:userId')
  async member(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
  ) {
    const { id: organizationId, userId } = organizationMemberParamSchema.parse(rawParams);
    return apiSuccess({
      user: await this.organizations.getMember(principal.id, organizationId, userId),
    });
  }

  @Patch(':id/members/:userId/name')
  async memberName(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Body() body: unknown,
  ) {
    const { id: organizationId, userId } = organizationMemberParamSchema.parse(rawParams);
    const input = updateMemberNameSchema.parse(body);
    return apiSuccess({ user: await this.organizations.updateMemberName(principal.id, organizationId, userId, input.name) });
  }

  @Patch(':id/members/:userId/status')
  async memberStatus(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Body() body: unknown,
  ) {
    const { id: organizationId, userId } = organizationMemberParamSchema.parse(rawParams);
    const input = updateMemberStatusSchema.parse(body);
    return apiSuccess({ user: await this.organizations.updateMemberStatus(principal.id, organizationId, userId, input.active) });
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
  ) {
    const { id: organizationId, userId } = organizationMemberParamSchema.parse(rawParams);
    await this.organizations.removeMember(principal.id, organizationId, userId);
    return apiSuccess({ ok: true });
  }

  @Post(':id/invitations')
  async invite(@Principal() principal: AuthenticatedPrincipal, @Param() rawParams: unknown, @Body() body: unknown) {
    const { id: organizationId } = organizationIdParamSchema.parse(rawParams);
    const input = createInvitationSchema.parse(body);
    const result = await this.organizations.createInvitation(
      principal.id,
      organizationId,
      input.email ?? null,
      { roleId: input.roleId, role: input.role },
    );
    return apiSuccess({
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
    });
  }

  @Get(':id/invitations')
  async invitations(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
  ) {
    const { id: organizationId } = organizationIdParamSchema.parse(rawParams);
    return apiSuccess(
      organizationInvitationListSchema.parse(
        await this.organizations.listInvitations(principal.id, organizationId),
      ),
    );
  }

  @Post('invitations/:token/accept')
  async accept(@Principal() principal: AuthenticatedPrincipal, @Param() rawParams: unknown) {
    const { token } = invitationTokenParamSchema.parse(rawParams);
    const organization = await this.organizations.acceptInvitation(principal.id, token);
    return apiSuccess({ organization });
  }
}
