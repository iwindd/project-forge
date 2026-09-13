import { z } from 'zod';
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js';
import { ORGANIZATION_PERMISSIONS } from '../../domain/organization.js';

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
});
const organizationRoleNameSchema = z.string().trim().min(1, 'กรุณากรอกชื่อบทบาท').max(80, 'ชื่อบทบาทต้องไม่เกิน 80 ตัวอักษร');

const organizationRolePermissionsSchema = z
  .array(z.enum([ORGANIZATION_PERMISSIONS.MANAGE, ORGANIZATION_PERMISSIONS.MANAGE_PROJECT]))
  .max(2, 'ไม่สามารถเลือกสิทธิ์ซ้ำได้');

export const updateMemberRoleSchema = z
  .object({
    roleId: databaseUuidSchema,
  })
  .strict();

export const createOrganizationRoleSchema = z.object({
  name: organizationRoleNameSchema,
  permissions: organizationRolePermissionsSchema,
});

export const updateOrganizationRoleSchema = z.object({
  name: organizationRoleNameSchema.optional(),
  permissions: organizationRolePermissionsSchema.optional(),
});

export const updateMemberStatusSchema = z.object({ active: z.boolean() });

export const createInvitationSchema = z
  .object({
    email: z.string().trim().email(),
    roleId: databaseUuidSchema,
  })
  .strict();

export const organizationIdParamSchema = z.object({
  id: databaseUuidSchema,
});

export const organizationRoleParamSchema = organizationIdParamSchema.extend({
  roleId: databaseUuidSchema,
});

export const organizationMemberParamSchema = organizationIdParamSchema.extend({
  userId: databaseUuidSchema,
});
export const organizationInvitationParamSchema = organizationIdParamSchema.extend({
  invitationId: databaseUuidSchema,
});

export const invitationTokenParamSchema = z.object({
  token: z.string().trim().min(1).max(512),
});

export const organizationMembersQuerySchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    roleId: z.union([z.literal('all'), databaseUuidSchema]).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(5).max(100).optional().default(10),
    sortBy: z.enum(['name', 'role', 'createdAt']).optional().default('createdAt'),
    sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
  })
  .strict();
