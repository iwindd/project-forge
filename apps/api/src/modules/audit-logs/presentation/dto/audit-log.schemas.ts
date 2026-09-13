import { z } from 'zod';
import { databaseUuidSchema } from '../../../../common/http/database-uuid.schema.js';

export const auditDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a calendar date in YYYY-MM-DD format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(`${value}T`);
  }, 'Expected a valid calendar date');

export const auditLogQuerySchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    actions: z.string().trim().max(2000).optional(),
    resourceTypes: z.string().trim().max(1000).optional(),
    from: auditDateSchema.optional(),
    to: auditDateSchema.optional(),
    organizationId: databaseUuidSchema.optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  })
  .superRefine((query, context) => {
    if (query.from && query.to && query.from > query.to) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'The end date must be on or after the start date',
      });
    }
  });

export const auditLogUserParamSchema = z.object({
  userId: databaseUuidSchema,
});

export const auditLogOrganizationParamSchema = z.object({
  organizationId: databaseUuidSchema,
});

export const auditLogOrganizationUserParamSchema = auditLogOrganizationParamSchema.extend({
  userId: databaseUuidSchema,
});

export const auditLogIdParamSchema = z.object({
  id: databaseUuidSchema,
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
