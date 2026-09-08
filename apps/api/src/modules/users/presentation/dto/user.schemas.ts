import { z } from 'zod';
import { AccessStatus, UserRole } from '../../domain/user.js';

export const changeUserStatusSchema = z.object({
  status: z.enum([AccessStatus.APPROVED, AccessStatus.REJECTED, AccessStatus.SUSPENDED]),
  reason: z.string().trim().max(1000).optional().default(''),
});

export const changeUserRoleSchema = z.object({
  role: z.enum([UserRole.USER, UserRole.ADMIN]),
  reason: z.string().trim().max(1000).optional().default(''),
});

export const changeUserNameSchema = z.object({
  name: z.string().trim().min(1).max(200),
  reason: z.string().trim().max(1000).optional().default(''),
});

export type ChangeUserStatusDto = z.infer<typeof changeUserStatusSchema>;
export type ChangeUserRoleDto = z.infer<typeof changeUserRoleSchema>;
export type ChangeUserNameDto = z.infer<typeof changeUserNameSchema>;
