import { z } from 'zod';
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js';

const organizationRoleSchema = z.object({
  id: databaseUuidSchema.nullable(),
  name: z.string().min(1),
  permissions: z.array(z.string()),
  isOwner: z.boolean(),
  legacyRole: z.enum(['OWNER', 'ADMIN', 'MEMBER']).nullable(),
});

const organizationSchema = z.object({
  id: databaseUuidSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  type: z.enum(['PERSONAL', 'SHARED']),
  role: organizationRoleSchema,
});

const identitySchema = z.object({
  id: databaseUuidSchema,
  githubUserId: z.string().min(1),
  githubLogin: z.string().min(1),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(['ADMIN', 'USER']),
  accessStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']),
  isActive: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const profileSchema = z.object({
  id: databaseUuidSchema,
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  timezone: z.string().nullable(),
  updatedAt: z.string().min(1),
});

export const authMeDataSchema = z.object({
  user: identitySchema,
  profile: profileSchema.nullable(),
  organizations: z.array(organizationSchema),
});
