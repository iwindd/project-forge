# Project Forge — โครงสร้างโปรเจคใหม่

เอกสารนี้กำหนดโครงสร้างเป้าหมายของ Project Forge โดยดู apptech เป็น reference ด้าน Next.js App Router, shared layout และ UI organization และดู pawpal เป็น reference ด้านการแยก frontend/API, permission system, user management, API client และ audit history

Reference เหล่านี้ใช้เป็นแนวทางเท่านั้น ไม่ copy business logic, database schema, branding หรือ provider configuration มาใช้ตรง ๆ

## สถาปัตยกรรมที่เลือก

~~~text
project-forge/
├── apps/
│   ├── web/                         # Next.js: user-facing application
│   └── api/                         # NestJS: HTTP API and domain use cases
├── infra/
│   ├── compose/                     # local/self-host services
│   ├── migrations/                  # migration documentation
│   └── docker/                      # sandbox images, Phase 2+
├── docs/                            # ADRs and runbooks
├── .requirements/                   # product/system requirements
├── PROJECT_FORGE.plan
└── phase_1.md
~~~

เริ่มเป็น monorepo แบบ pnpm workspace เพื่อแยก deployable apps โดยไม่มี packages/shared หรือ packages/ui ในรุ่นแรก แต่ละ app มี types/schema ของตัวเองและ web เรียก API ผ่าน client layer ส่วน Next.js ใช้ App Router และ route group/layout แบบ apptech ปัจจุบันมีเพียง `apps/web` กับ `apps/api`; worker จะเพิ่มเมื่อเริ่ม background workflow ใน phase หลัง

## Web application

~~~text
apps/web/src/
├── app/
│   ├── (auth)/                       # login, access-pending, access-blocked
│   ├── (main)/
│   │   ├── layout.tsx                # user shell, header, sidebar, theme
│   │   ├── page.tsx                  # project home / empty state
│   │   └── projects/
│   │       ├── page.tsx              # project list
│   │       ├── new/page.tsx          # add project
│   │       └── [projectId]/page.tsx  # project detail/edit
│   ├── layout.tsx                    # minimal document/root setup
│   └── admin/                        # internal admin routes within this web app
├── components/
│   ├── layout/                       # app shell, nav, account menu
│   ├── projects/                     # cards, form, status, detail
│   └── auth/
├── features/
│   ├── auth/
│   └── projects/
└── libs/api/                         # typed NestJS API client; no database access
~~~

Apptech เป็น reference สำหรับ App Router layouts, providers, page header, navigation, responsive behavior และ error/loading screens โดย admin อยู่ใน web app เดียวกันที่ /admin และใช้ protected layout แยกจาก user pages

## Admin area ใน web app

~~~text
apps/web/src/app/admin/
├── app/
│   ├── (auth)/layout.tsx             # admin login/blocked states
│   ├── admin/layout.tsx              # admin guard + admin shell
│   └── admin/
│       ├── page.tsx                  # dashboard summary
│       ├── users/page.tsx             # user table
│       ├── users/[userId]/page.tsx   # user detail
│       └── access-requests/page.tsx  # pending requests
├── components/
│   ├── admin-shell.tsx
│   ├── admin-header.tsx
│   ├── navigation/
│   ├── data-table/
│   └── user/
├── configs/
│   ├── routes.ts                     # route metadata and permission keys
│   ├── navigation.ts
│   └── permissions.ts
├── features/
│   ├── users/
│   └── access-requests/
└── libs/api/                         # typed NestJS API access; no database access
~~~

Apptech เป็น reference สำหรับ header, sidebar, page header และ theme ส่วน Pawpal เป็น reference สำหรับ user list/detail, permission navigation, filter, action menu, status action และ history layout โดยไม่มี frontend admin app แยก

ระบบยังแยก user area กับ admin area ด้วย route group/layout ภายใน web app เดียวกัน เพราะ navigation, provider, authorization และ error boundary คนละชุด การซ่อนเมนูไม่ใช่การป้องกันสิทธิ์ /admin ต้องมี server-side authorization ของ NestJS และ protected admin layout

## NestJS API structure

~~~text
apps/api/src/
├── main.ts
├── app.module.ts
├── common/
│   ├── auth/                         # principal, guards, decorators
│   ├── authorization/                # policy/permission checks
│   ├── database/                     # MikroORM config, entities and transactions
│   ├── errors/                       # public error mapping
│   ├── audit/                        # audit service
│   └── pagination/
├── modules/
│   ├── auth/
│   ├── access-requests/
│   ├── users/
│   ├── projects/
│   └── health/
└── migrations/                       # MikroORM migrations
~~~

ทุก module แยก domain/, application/, infrastructure/ และ presentation/ ตาม hexagonal pattern ของ Pawpal Controller รับ request และเรียก use case เท่านั้น ใช้ MikroORM ผ่าน repository/adapter ใน API ห้ามให้ Next.js อ่าน DB โดยตรง และห้ามให้ controller สั่ง EntityManager กระจายทั่วไฟล์

Phase 1 มี module:

- Auth: GitHub OAuth, session, logout และ expiry
- Access Requests: pending/approve/reject และ admin policy
- Users: list/detail/role/status/session revoke/audit
- Projects: create/update/archive metadata
- Health: readiness/liveness และ dependency checks

Hermes, Chat, Sandbox, Issues และ Pull Requests จะยังไม่อยู่ใน Phase 1 แต่ module boundary ของ Phase 2 จองไว้ให้เพิ่มโดยไม่ย้าย identity/project/audit core

## API client boundary

Next.js เรียก NestJS ผ่าน apps/web/src/lib/api.ts แยก API client กับ UI ให้ชัด API client จัดการ base URL, credentials, error envelope, pagination และ request IDs ฝั่ง web ไม่ import MikroORM entity, database config หรือ API private secret

Phase 1 ใช้ UI components ภายใน apps/web/src/components/ ไปก่อน ไม่แยก packages/ui หรือ type declaration package เพื่อให้ขอบเขตเล็กและเปลี่ยน UI ได้เร็ว เมื่อมี duplication ที่พิสูจน์แล้วค่อย extract ใน phase หลัง

## Database baseline

เลือก PostgreSQL + MikroORM เป็น database baseline ของระบบใหม่ ใช้ entity, repository adapter และ migration ของ MikroORM ใน apps/api เป็นเจ้าของ schema เพียงชุดเดียว

Phase 1 tables:

~~~text
User
OAuthAccount
Session
AccessRequest
AuditLog
Project
ProjectMember
~~~

Project ใน Phase 1 เป็น metadata record เท่านั้น การกด Add Project ห้าม clone repo, สร้าง sandbox, เรียก Hermes, install dependency หรือ build

## Admin management model

แนวทางจาก Pawpal ที่จะนำมาใช้:

- route metadata กับ navigation config แยกจาก page
- permission guard ที่ backend ไม่ใช่เพียงซ่อนเมนู
- user list แบบ server-side pagination/search/filter
- user detail แยก profile, access status, role และ security history
- action แยก operation เช่น approve, reject, suspend, change role, revoke sessions
- ใช้ transaction เมื่อเปลี่ยน status/role
- ป้องกัน admin ปิดใช้งานตัวเอง
- ป้องกันไม่ให้ปิด admin คนสุดท้าย
- บันทึก actor, target, before, after, reason และ request context ใน audit log
- action ทุกตัวมี optimistic refresh และ public error code ที่ UI แปลผลได้

Phase 1 role มี ADMIN และ USER; access status มี PENDING, APPROVED, REJECTED, SUSPENDED ก่อนเพิ่ม project-level roles ใน phase sharing

## Routing and layout rules

- apps/web มี public/auth layout และ authenticated main layout แยกกัน
- apps/web มี protected admin layout ภายใน web app
- route config เป็น source สำหรับ sidebar, breadcrumbs และ permission hints
- direct URL access ต้องถูกตรวจซ้ำที่ server/API
- global root layout มีเฉพาะ document, fonts และ providers ที่จำเป็น
- ใช้ loading.tsx, error.tsx, not-found.tsx ใน route segment สำคัญ
- table/detail ใช้ server query และรักษา search/filter/page state ตาม URL

## Local development

~~~text
pnpm dev:api
pnpm dev:web
pnpm dev:web
pnpm db:migrate
pnpm db:seed
pnpm check-types
pnpm lint
pnpm test
~~~

Docker Compose ระยะแรกมี PostgreSQL ที่ host port `55432` และยังไม่มี Redis จนกว่าจะเริ่ม worker ใน phase หลัง การ deploy production ไม่ต้องใช้ Vercel

## Boundary สำคัญ

- User web ไม่อ่าน admin route หรือ admin-only data
- Admin web ไม่ได้สิทธิ์ project ทุกตัวโดยอัตโนมัติ; policy กำหนดตาม role/scope
- NestJS เป็น authorization authority
- MikroORM migrations เป็นเจ้าของ schema; frontend ไม่มี migration/DB access
- OAuth token ไม่ส่งให้ client component
- Project metadata ไม่มี secret plaintext ใน response
- Phase 1 ไม่สร้าง Hermes session ใด ๆ
- ไม่มี public registration ที่เข้าใช้งานได้ทันที ผู้ใช้ภายนอกต้องผ่าน GitHub identity และ owner/admin approval
- ไม่มี public AI endpoint; API ตรวจ internal access ก่อนสร้าง project หรือ run ทุกครั้ง
