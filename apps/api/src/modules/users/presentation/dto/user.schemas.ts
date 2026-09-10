import { z } from 'zod';
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js';
import { AccessStatus, UserRole } from '../../domain/user.js';

export const userIdParamSchema = z.object({ id: databaseUuidSchema });

export const userListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
  role: z.enum(['ADMIN', 'EDITOR']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(25),
  sortBy: z.enum(['name', 'email', 'role', 'isActive', 'createdAt']).optional().default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
});

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
