# Phase 1 architecture requirements

```text
Browser -> apps/admin (Next.js) -> apps/api (NestJS) -> PostgreSQL (MikroORM)
```

- มี deployable app แค่ `apps/admin` และ `apps/api`
- `/admin` อยู่ใน Next.js admin app เดียวกันกับ account และ organization routes
- ไม่มี `packages/shared`, `packages/ui` หรือ type declaration package แยก
- Admin เรียก API ผ่าน `apps/admin/src/lib/api/api.ts` สำหรับ browser และ `apps/admin/src/lib/api-server.ts` สำหรับ SSR โดยไม่มี database access
- API เป็นเจ้าของ authentication, authorization, validation, state transition, audit และ MikroORM
- Phase 1 ยังไม่สร้าง worker, Hermes adapter หรือ sandbox runner
- PostgreSQL local ใช้ host port `55432` เพื่อไม่ชนกับ project-bot ที่ใช้ `5433`
