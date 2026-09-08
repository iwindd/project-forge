# Project Forge

Project Forge คือระบบเว็บ self-hosted สำหรับผู้ใช้ภายในองค์กร เพื่อเชื่อม GitHub, เลือก Hermes agents, สร้าง project conversations และทำ workflow งานพัฒนาแบบตรวจสอบได้

เอกสารนี้เป็นแผนและ foundation ของระบบใหม่ด้วย NestJS และ Next.js ไม่ใช่การย้าย Discord bot เดิมมาเป็นเว็บ และไม่ผูกกับ Vercel ในการรัน AI หรือ deploy

## Phase 1 ที่ทำเสร็จใน workspace นี้

- `apps/api` — NestJS API, PostgreSQL/MikroORM, GitHub OAuth, session cookie, access request, admin policies, audit log และ Project metadata CRUD
- `apps/web` — Next.js App Router, login/access states, protected user shell, Projects list/add/edit/archive และ `/admin` users/access requests
- `apps/web` เรียก API ผ่าน `src/lib/api.ts` เท่านั้น; ไม่มีการ import database หรือ MikroORM จาก web
- Add Project ยังเป็น metadata-only: ไม่ clone, ไม่สร้าง sandbox, ไม่เรียก Hermes, ไม่ install และไม่ build
- ไม่มี Discord, Hermes, Chat, GitHub App, Issues หรือ Pull Requests ใน Phase 1

GitHub OAuth เป็นจุดที่ต้องใส่ credential ของ deployment เองใน `.env`; ค่าใน workspace มีเพียง local development defaults และไม่มี secret จริง

## Local setup

```text
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm dev:api
pnpm dev:web
```

เว็บอยู่ที่ `http://localhost:3000` และ API อยู่ที่ `http://localhost:3001/api/v1` ส่วน PostgreSQL ของ Project Forge ใช้ host port `55432` เพื่อไม่ชนกับ project-bot ที่ใช้ `5433`

ตั้งค่า GitHub OAuth ใน `.env` โดยใช้ callback:

```text
http://localhost:3001/api/v1/auth/github/callback
```

กำหนด `ADMIN_GITHUB_IDS` เป็น GitHub numeric user ID ของผู้ดูแลคนแรก หรือใช้ `SEED_ADMIN_GITHUB_ID` กับ `pnpm --filter @project-forge/api db:seed` หลัง migration

ตรวจระบบโดยไม่ต้อง login:

```text
GET http://localhost:3001/api/v1/health
```

## เอกสาร

- [PROJECT_FORGE.plan](PROJECT_FORGE.plan) — machine-readable roadmap, principles, phases และ dependencies
- [phase_1.md](phase_1.md) — แผนระยะแรก: project foundation, GitHub-only login, request access และ admin/user management
- [structure.md](structure.md) — โครงสร้างโปรเจคใหม่ที่นำ pattern จาก apptech และ pawpal มารวมกัน

## ขอบเขตระบบเต็มรูปแบบ

1. Identity และ workspace access
2. GitHub App และ repository permissions
3. Projects และ branch/runtime configuration
4. Hermes agent catalog และ conversations
5. Sandbox provisioning และ file explorer
6. Durable streamed agent runs
7. Find Issue / Ultra Review / pre-issues
8. Create Feature / Fix Issues / pre-pull-requests
9. Approval, GitHub Issue/PR publication และ retry
10. Project sharing, audit, observability และ self-host operations

## สถาปัตยกรรมเป้าหมาย

```text
Browser
  -> Next.js web
  -> NestJS API
      -> PostgreSQL
      -> Redis/job queue
      -> Hermes adapter
      -> sandbox runner
      -> GitHub App adapter
  -> NestJS worker
```

Next.js ดูแล UI และเรียก NestJS API ผ่าน API client เท่านั้น ส่วน NestJS เป็นเจ้าของ business rules, authorization, state transitions และ external side effects งาน AI ต้องรันผ่าน worker ที่มี checkpoint ไม่ถืออายุงานไว้กับ HTTP request ระบบไม่มี public AI endpoint และ approved internal users เท่านั้นจึงสร้างงาน AI ได้

## Phase order

Phase 1 ทำโครงสร้างระบบ, access, Projects และ user administration ให้มั่นคงก่อน ยังไม่เริ่ม Hermes, Chat, sandbox หรือ workflow ที่มี side effect การเชื่อม Hermes และ chat จะเริ่มใน Phase 2 หลังจาก identity, authorization, database และ layout พร้อมแล้ว
