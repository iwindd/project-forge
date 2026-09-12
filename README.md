# Project Forge

Project Forge คือระบบเว็บแบบ self-hosted สำหรับทีมภายใน ใช้ GitHub เป็น identity provider และจัดการ Organization, สมาชิก, โปรเจกต์ และ audit history ผ่าน dashboard เดียว

## Current Phase 1 baseline

- `apps/api` เป็น NestJS API และเจ้าของ business rules, authorization, validation, state transitions และ PostgreSQL/MikroORM schema
- `apps/admin` เป็น Next.js dashboard ที่เรียก API ผ่าน browser/SSR client เท่านั้น
- Login ใช้ GitHub เท่านั้น; การเข้า Organization เป็น invite-only และสิทธิ์สมาชิกมาจาก active Organization membership
- Organization เป็นเจ้าของ project metadata โดยตรง; project ยังไม่ clone repository, สร้าง sandbox, เรียก Hermes, install dependency หรือ build
- มี Organization roles (`OWNER`, `ADMIN`, `MEMBER`) และ custom permissions ตาม scope ที่กำหนด
- Schema ปัจจุบันใช้ `connections` เป็น canonical GitHub identity model และไม่มี active access-request flow

Hermes, conversations, workers, sandboxes, issue review และ pull-request workflow เป็นงานของ phase ถัดไป

## Local setup

```text
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm dev:api
pnpm dev:admin
```

Admin app อยู่ที่ `http://localhost:5051` และ API อยู่ที่ `http://localhost:5050/api/v1` PostgreSQL ใช้ host port `55432`

Migration นี้เป็น canonical DDL สำหรับ schema ที่ยังไม่ deploy และไม่ทำ upgrade/backfill จาก migration history รุ่นเก่า หากมี local database จาก checkout ก่อนหน้า ต้องขออนุมัติ schema recreation แยกก่อนดำเนินการ

การ seed เป็น operation ที่ต้องสั่งแยกและต้องกำหนด `SEED_ADMIN_GITHUB_ID` ก่อน:

```text
pnpm --filter @project-forge/api db:seed
```

หลัง schema recreation และ seed ที่ได้รับอนุมัติแล้ว สามารถตรวจ named schema invariants, foreign keys, unique constraints และ seed records แบบ read-only ได้ด้วย:

```text
pnpm db:verify
```

ตั้งค่า GitHub OAuth ใน `.env` ด้วย callback `http://localhost:5050/api/v1/auth/github/callback` และใช้ `GET http://localhost:5050/api/v1/health` ตรวจ health โดยไม่ต้อง login

## Current documentation

- [CONTEXT.md](CONTEXT.md) — glossary และ domain rules
- [architecture-refactor-spec.md](docs/architecture-refactor-spec.md) — current architecture/spec
- [architecture-refactor-tickets.md](docs/architecture-refactor-tickets.md) — GitHub issue dependency graph
- [ADR directory](docs/adr/) — accepted architecture decisions
- [phase_1.md](phase_1.md) — historical archive; ไม่ใช่ source of truth
- [.requirements/](.requirements/) — historical product input; ไม่ใช่ implementation instruction

## Roadmap

1. Foundation, invite-only access, Organization roles, project metadata และ API-backed dashboard
2. Hermes conversations และ sandbox lifecycle
3. Durable conversations และ agent orchestration
4. Review workflow และ pre-issues
5. Feature/fix workflow และ pre-pull-requests
6. GitHub App publication และ synchronization
7. Sharing, operations, security และ self-host release

## Target architecture

```text
Browser
  -> apps/admin (Next.js dashboard)
  -> apps/api (NestJS API)
      -> PostgreSQL
      -> worker / job queue
      -> Hermes adapter
      -> sandbox runner
      -> GitHub adapter
```

งาน background ต้องมี persisted state, event history, idempotency และ cancellation/recovery semantics ไม่ผูกอายุงานไว้กับ HTTP request และห้ามส่ง secret หรือ access token ไปยัง browser, prompt หรือ log
