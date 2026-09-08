import { z } from 'zod';
import { OrganizationMemberRole } from '../../domain/organization.js';

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(60).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum([OrganizationMemberRole.OWNER, OrganizationMemberRole.ADMIN, OrganizationMemberRole.MEMBER]),
});

export const updateMemberNameSchema = z.object({ name: z.string().trim().min(1).max(200) });

export const updateMemberStatusSchema = z.object({ active: z.boolean() });

export const createInvitationSchema = z.object({
  email: z.string().email().optional().nullable(),
  role: z.enum([OrganizationMemberRole.ADMIN, OrganizationMemberRole.MEMBER]).default(OrganizationMemberRole.MEMBER),
});

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;
