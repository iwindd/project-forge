import { z } from "zod";

export const ORGANIZATION_MANAGE_PERMISSION = "organization.manage" as const;

export const organizationRoleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อบทบาท")
    .max(80, "ชื่อบทบาทต้องไม่เกิน 80 ตัวอักษร"),
  permissions: z
    .array(z.literal(ORGANIZATION_MANAGE_PERMISSION))
    .max(1, "ไม่สามารถเลือกสิทธิ์ซ้ำได้"),
});

export type OrganizationRoleFormValues = z.infer<
  typeof organizationRoleFormSchema
>;

export const EMPTY_ORGANIZATION_ROLE_FORM: OrganizationRoleFormValues = {
  name: "",
  permissions: [],
};
