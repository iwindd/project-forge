import { z } from 'zod';
import {
  ORGANIZATION_PERMISSIONS,
  OrganizationMemberRole,
} from '../../domain/organization.js';

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(60).optional(),
});

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
    roleId: z.string().uuid().optional(),
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

export const updateMemberNameSchema = z.object({ name: z.string().trim().min(1).max(200) });

export const updateMemberStatusSchema = z.object({ active: z.boolean() });

export const createInvitationSchema = z.object({
  email: z.string().email().optional().nullable(),
  roleId: z.string().uuid().optional(),
  role: z.enum([OrganizationMemberRole.ADMIN, OrganizationMemberRole.MEMBER]).optional(),
}).refine((value) => Boolean(value.roleId || value.role), {
  message: 'A roleId or legacy role is required',
});

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;
