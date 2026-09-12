import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import {
  apiNullSuccessResponseSchema,
  apiSuccess,
} from '../../../common/http/api-response.js';
import { Principal } from '../../../common/auth/principal.decorator.js';
import { SessionGuard } from '../../../common/auth/session.guard.js';
import { getRequestId } from '../../../common/http/request-context.js';
import type { AuthenticatedPrincipal } from '../../../common/auth/auth.types.js';
import { ORGANIZATION_PERMISSIONS } from '../domain/organization.js';
import { OrganizationService } from '../application/organization.service.js';
import { CancelOrganizationInvitationUseCase } from '../application/use-cases/cancel-organization-invitation-use-case.js';
import { CreateOrganizationRoleUseCase } from '../application/use-cases/create-organization-role-use-case.js';
import { DeleteOrganizationRoleUseCase } from '../application/use-cases/delete-organization-role-use-case.js';
import { ListOrganizationMembersUseCase } from '../application/use-cases/list-organization-members-use-case.js';
import { ListOrganizationRolesUseCase } from '../application/use-cases/list-organization-roles-use-case.js';
import { UpdateOrganizationRoleUseCase } from '../application/use-cases/update-organization-role-use-case.js';
import {
  createInvitationSchema,
  updateMemberRoleSchema,
  updateMemberStatusSchema,
  updateOrganizationSchema,
  createOrganizationRoleSchema,
  updateOrganizationRoleSchema,
  invitationTokenParamSchema,
  organizationIdParamSchema,
  organizationInvitationParamSchema,
  organizationMemberParamSchema,
  organizationMembersQuerySchema,
  organizationRoleParamSchema,
} from './dto/organization.schemas.js';
import {
  organizationInvitationListSchema,
  organizationInvitationResponseSchema,
  organizationListSchema,
  organizationMemberListSchema,
  organizationMemberRoleResponseSchema,
  organizationMemberUserResponseSchema,
  organizationResponseSchema,
  organizationRoleResponseSchema,
  organizationRoleListSchema,
  organizationRolesResponseSchema,
  organizationMembersResponseSchema,
  okResponseSchema,
} from './dto/organization-response.schemas.js';

function serializeOrganization(organization: {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    type: organization.type,
    status: organization.status,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}

@Controller('organizations')
@UseGuards(SessionGuard)
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationService,
    private readonly listOrganizationMembers: ListOrganizationMembersUseCase,
    private readonly listOrganizationRoles: ListOrganizationRolesUseCase,
    private readonly createOrganizationRole: CreateOrganizationRoleUseCase,
    private readonly updateOrganizationRole: UpdateOrganizationRoleUseCase,
    private readonly deleteOrganizationRole: DeleteOrganizationRoleUseCase,
    private readonly cancelOrganizationInvitation: CancelOrganizationInvitationUseCase,
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

  @Get(':id/roles')
  async roles(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
  ) {
    const { id: organizationId } = organizationIdParamSchema.parse(rawParams);
    const roles = organizationRoleListSchema.parse(
      await this.listOrganizationRoles.execute(principal.id, organizationId),
    );
    return organizationRolesResponseSchema.parse(
      apiSuccess(roles, {
        availablePermissions: [
          { key: ORGANIZATION_PERMISSIONS.MANAGE },
          { key: ORGANIZATION_PERMISSIONS.MANAGE_PROJECT },
        ],
      }),
    );
  }

  @Post(':id/roles')
  async createRole(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const { id: organizationId } = organizationIdParamSchema.parse(rawParams);
    const input = createOrganizationRoleSchema.parse(body);
    const role = await this.createOrganizationRole.execute(
      principal.id,
      organizationId,
      input,
      { requestId: getRequestId(request) },
    );
    return apiSuccess(organizationRoleResponseSchema.parse({ role }));
  }

  @Patch(':id/roles/:roleId')
  async updateRole(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const { id: organizationId, roleId } = organizationRoleParamSchema.parse(rawParams);
    const input = updateOrganizationRoleSchema.parse(body);
    const role = await this.updateOrganizationRole.execute(
      principal.id,
      organizationId,
      roleId,
      input,
      { requestId: getRequestId(request) },
    );
    return apiSuccess(organizationRoleResponseSchema.parse({ role }));
  }

  @Delete(':id/roles/:roleId')
  async deleteRole(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Req() request: Request,
  ) {
    const { id: organizationId, roleId } = organizationRoleParamSchema.parse(rawParams);
    const result = await this.deleteOrganizationRole.execute(
      principal.id,
      organizationId,
      roleId,
      { requestId: getRequestId(request) },
    );
    return apiSuccess(okResponseSchema.parse(result));
  }

  @Get(':id/members')
  async members(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Query() rawQuery: unknown,
  ) {
    const { id: organizationId } = organizationIdParamSchema.parse(rawParams);
    const query = organizationMembersQuerySchema.parse(rawQuery);
    const result = await this.listOrganizationMembers.execute(
      principal.id,
      organizationId,
      query,
    );
    return organizationMembersResponseSchema.parse(
      apiSuccess(organizationMemberListSchema.parse(result.data), {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      }),
    );
  }

  @Patch(':id')
  async update(@Principal() principal: AuthenticatedPrincipal, @Param() rawParams: unknown, @Body() body: unknown, @Req() request: Request) {
    const { id: organizationId } = organizationIdParamSchema.parse(rawParams);
    const input = updateOrganizationSchema.parse(body);
    if (input.name === undefined) {
      const { organization } = await this.organizations.requireManager(principal.id, organizationId);
      return apiSuccess(organizationResponseSchema.parse({
        organization: serializeOrganization(organization),
      }));
    }
    const organization = await this.organizations.updateOrganization(
      principal.id,
      organizationId,
      input.name,
      { requestId: getRequestId(request) },
    );
    return apiSuccess(organizationResponseSchema.parse({
      organization: serializeOrganization(organization),
    }));
  }

  @Patch(':id/members/:userId')
  async updateMember(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const { id: organizationId, userId } = organizationMemberParamSchema.parse(rawParams);
    const input = updateMemberRoleSchema.parse(body);
    const membership = await this.organizations.updateMemberRole(
      principal.id,
      organizationId,
      userId,
      input,
      { requestId: getRequestId(request) },
    );
    return apiSuccess(organizationMemberRoleResponseSchema.parse({ membership }));
  }

  @Get(':id/members/:userId')
  async member(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
  ) {
    const { id: organizationId, userId } = organizationMemberParamSchema.parse(rawParams);
    const user = await this.organizations.getMember(
      principal.id,
      organizationId,
      userId,
    );
    return apiSuccess(organizationMemberUserResponseSchema.parse({ user }));
  }

  @Patch(':id/members/:userId/status')
  async memberStatus(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const { id: organizationId, userId } = organizationMemberParamSchema.parse(rawParams);
    const input = updateMemberStatusSchema.parse(body);
    const user = await this.organizations.updateMemberStatus(
      principal.id,
      organizationId,
      userId,
      input.active,
      { requestId: getRequestId(request) },
    );
    return apiSuccess(organizationMemberUserResponseSchema.parse({ user }));
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Req() request: Request,
  ) {
    const { id: organizationId, userId } = organizationMemberParamSchema.parse(rawParams);
    await this.organizations.removeMember(principal.id, organizationId, userId, { requestId: getRequestId(request) });
    return apiSuccess(okResponseSchema.parse({ ok: true }));
  }

  @Post(':id/invitations')
  async invite(@Principal() principal: AuthenticatedPrincipal, @Param() rawParams: unknown, @Body() body: unknown, @Req() request: Request) {
    const { id: organizationId } = organizationIdParamSchema.parse(rawParams);
    const input = createInvitationSchema.parse(body);
    const result = await this.organizations.createInvitation(
      principal.id,
      organizationId,
      input.email,
      { roleId: input.roleId },
      { requestId: getRequestId(request) },
    );
    return apiSuccess(organizationInvitationResponseSchema.parse({
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
    }));
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

  @Delete(':id/invitations/:invitationId')
  async cancelInvitation(
    @Principal() principal: AuthenticatedPrincipal,
    @Param() rawParams: unknown,
    @Req() request: Request,
  ) {
    const { id: organizationId, invitationId } = organizationInvitationParamSchema.parse(rawParams);
    await this.cancelOrganizationInvitation.execute(
      principal.id,
      organizationId,
      invitationId,
      { requestId: getRequestId(request) },
    );
    return apiNullSuccessResponseSchema.parse(apiSuccess(null));
  }

  @Post('invitations/:token/accept')
  async accept(@Principal() principal: AuthenticatedPrincipal, @Param() rawParams: unknown, @Req() request: Request) {
    const { token } = invitationTokenParamSchema.parse(rawParams);
    const organization = await this.organizations.acceptInvitation(principal.id, token, { requestId: getRequestId(request) });
    return apiSuccess(organizationResponseSchema.parse({
      organization: serializeOrganization(organization),
    }));
  }
}
