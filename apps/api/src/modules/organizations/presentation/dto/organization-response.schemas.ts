import { z } from 'zod';
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js';

const organizationRoleSchema = z.object({
  id: databaseUuidSchema.nullable(),
  name: z.string().min(1),
  permissions: z.array(z.string()),
  isOwner: z.boolean(),
  legacyRole: z.enum(['OWNER', 'ADMIN', 'MEMBER']).nullable(),
});

export const organizationListSchema = z.array(
  z.object({
    id: databaseUuidSchema,
    name: z.string().min(1),
    slug: z.string().min(1),
    type: z.enum(['PERSONAL', 'SHARED']),
    role: organizationRoleSchema,
    status: z.enum(['ACTIVE', 'ARCHIVED', 'SUSPENDED']),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  }),
);
