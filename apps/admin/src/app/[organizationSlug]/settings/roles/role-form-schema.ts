import { z } from "zod";

export const ORGANIZATION_MANAGE_PERMISSION = "organization.manage" as const;
export const ORGANIZATION_MANAGE_PROJECT_PERMISSION = "project.manage" as const;
export const ORGANIZATION_PERMISSION_KEYS = [
  ORGANIZATION_MANAGE_PERMISSION,
  ORGANIZATION_MANAGE_PROJECT_PERMISSION,
] as const;

export const organizationRoleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อบทบาท")
    .max(80, "ชื่อบทบาทต้องไม่เกิน 80 ตัวอักษร"),
  permissions: z
    .array(z.enum(ORGANIZATION_PERMISSION_KEYS))
    .max(2, "ไม่สามารถเลือกสิทธิ์ซ้ำได้"),
});

export type OrganizationRoleFormValues = z.infer<
  typeof organizationRoleFormSchema
>;

export const EMPTY_ORGANIZATION_ROLE_FORM: OrganizationRoleFormValues = {
  name: "",
  permissions: [],
};
