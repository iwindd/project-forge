import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email("กรุณากรอกอีเมลให้ถูกต้อง").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
    .max(128, "รหัสผ่านต้องไม่เกิน 128 ตัวอักษร"),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;
