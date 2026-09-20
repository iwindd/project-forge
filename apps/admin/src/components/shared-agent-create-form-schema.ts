import { z } from 'zod';

const handleSchema = z
  .string()
  .trim()
  .min(1, 'กรุณาระบุ Handle')
  .max(64, 'Handle ต้องไม่เกิน 64 ตัวอักษร')
  .regex(/^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/, 'Handle ใช้ได้เฉพาะ a-z, 0-9, _ และ -');

const uniqueSelection = (label: string) =>
  z
    .array(z.string().trim().min(1))
    .max(100, `${label} มีได้ไม่เกิน 100 รายการ`)
    .refine((values) => new Set(values).size === values.length, `${label} ห้ามซ้ำกัน`);

const avatarFileSchema = z
  .custom<File | null>(
    (value) =>
      value === null ||
      (typeof value === 'object' &&
        value !== null &&
        typeof (value as { size?: unknown }).size === 'number' &&
        typeof (value as { type?: unknown }).type === 'string'),
    'ไฟล์ Avatar ไม่ถูกต้อง',
  )
  .refine((file) => file === null || file.size <= 2_000_000, 'Avatar ต้องมีขนาดไม่เกิน 2 MB')
  .refine(
    (file) => file === null || ['image/png', 'image/jpeg', 'image/webp'].includes(file.type),
    'Avatar ต้องเป็น PNG, JPEG หรือ WebP',
  );

export const sharedAgentCreateFormSchema = z.object({
  handle: handleSchema,
  displayName: z.string().trim().min(1, 'กรุณาระบุชื่อที่แสดง').max(160),
  description: z.string().trim().max(500, 'คำอธิบายต้องไม่เกิน 500 ตัวอักษร'),
  role: z.string().trim().min(1, 'กรุณาระบุบทบาท').max(160),
  personality: z.string().trim().min(1, 'กรุณาระบุ Personality').max(12_000),
  provider: z.string().trim().min(1, 'กรุณาเลือก Provider'),
  model: z.string().trim().min(1, 'กรุณาเลือก Model'),
  skills: uniqueSelection('Skills'),
  toolsets: uniqueSelection('Toolsets'),
  confirmExpensiveModel: z.boolean().default(false),
  avatar: avatarFileSchema,
});

export type SharedAgentCreateFormValues = z.infer<typeof sharedAgentCreateFormSchema>;
