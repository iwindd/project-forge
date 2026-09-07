# Phase 1 architecture requirements

```text
Browser -> apps/web (Next.js) -> apps/api (NestJS) -> PostgreSQL (MikroORM)
```

- มี deployable app แค่ `apps/web` และ `apps/api`
- `/admin` อยู่ใน Next.js web app เดียวกัน ไม่สร้าง `apps/admin`
- ไม่มี `packages/shared`, `packages/ui` หรือ type declaration package แยก
- Web เรียก API ผ่าน `apps/web/src/lib/api.ts` และไม่มี database access
- API เป็นเจ้าของ authentication, authorization, validation, state transition, audit และ MikroORM
- Phase 1 ยังไม่สร้าง worker, Hermes adapter หรือ sandbox runner
- PostgreSQL local ใช้ host port `55432` เพื่อไม่ชนกับ project-bot ที่ใช้ `5433`
