import { z } from 'zod';
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js';
import {
  ORGANIZATION_PERMISSIONS,
  OrganizationMemberRole,
} from '../../domain/organization.js';

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
});
const legacyMemberRoleSchema = z.enum([
  OrganizationMemberRole.OWNER,
  OrganizationMemberRole.ADMIN,
  OrganizationMemberRole.MEMBER,
]);

const organizationRoleNameSchema = z
  .string()
  .trim()
  .min(1, 'กรุณากรอกชื่อบทบาท')
  .max(80, 'ชื่อบทบาทต้องไม่เกิน 80 ตัวอักษร');

const organizationRolePermissionsSchema = z
  .array(z.enum([ORGANIZATION_PERMISSIONS.MANAGE]))
  .max(1, 'ไม่สามารถเลือกสิทธิ์ซ้ำได้');

export const updateMemberRoleSchema = z
  .object({
    roleId: databaseUuidSchema.optional(),
    role: legacyMemberRoleSchema.optional(),
  })
  .refine((value) => Boolean(value.roleId || value.role), {
    message: 'A roleId or legacy role is required',
  });

export const createOrganizationRoleSchema = z.object({
  name: organizationRoleNameSchema,
  permissions: organizationRolePermissionsSchema,
});

export const updateOrganizationRoleSchema = z.object({
  name: organizationRoleNameSchema.optional(),
  permissions: organizationRolePermissionsSchema.optional(),
});

export const updateMemberStatusSchema = z.object({ active: z.boolean() });

export const createInvitationSchema = z.object({
  email: z.string().trim().email(),
  roleId: databaseUuidSchema.optional(),
  role: z
    .enum([OrganizationMemberRole.ADMIN, OrganizationMemberRole.MEMBER])
    .default(OrganizationMemberRole.MEMBER),
});

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

export const organizationMembersQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  role: z
    .enum(['all', 'EDITOR', OrganizationMemberRole.OWNER, OrganizationMemberRole.ADMIN, OrganizationMemberRole.MEMBER])
    .optional()
    .default('all'),
  roleId: z.union([z.literal('all'), databaseUuidSchema]).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(10),
  sortBy: z.enum(['name', 'role', 'createdAt']).optional().default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
});
