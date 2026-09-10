# Project Forge Features

- Generated at: `2026-09-11T00:48:24+07:00`
- Scan mode: `auto`
- Status: `complete`

## Feature tree

Project Forge
├── Identity and access
│   ├── GitHub OAuth login and session cookies (page / API)
│   ├── User profiles, connections, and session administration
│   └── Admin access and user status management
├── Organization administration
│   ├── Organization-scoped routing and switching (page/component)
│   ├── Organization members and invitations (page/API)
│   ├── Organization roles and role editor (page/API)
│   └── Organization lifecycle and access policies (API/domain)
├── Projects
│   ├── Project metadata CRUD (page/API)
│   ├── Project archive flow (page/API)
│   └── Organization-owned project access (API/domain)
├── Audit and security
│   ├── Audit log listing and filters (page/API)
│   ├── Security activity and request context (component/API)
│   └── Standard API response and public error handling (API)
├── Admin application shell
│   ├── Authenticated admin navigation and layouts (page/component)
│   ├── Account/profile/settings screens (page/component)
│   ├── Thai localization and date/time formatting (config)
│   └── Shared Mantine, Redux, table, filter, and status components (component)
├── API and persistence
│   ├── NestJS module and use-case architecture (API)
│   ├── PostgreSQL/MikroORM entities, migrations, and seed (API/infra)
│   ├── Zod presentation-boundary validation (API)
│   └── Health endpoint and local development services (API/infra)
└── Quality and delivery
    ├── API and admin Vitest suites (test)
    ├── TypeScript, Biome, ESLint, and boundary checks (config)
    ├── Pull-request CI (infra)
    └── Docker Compose PostgreSQL (infra)

## Evidence summary

- Identity/access: `apps/api/src/modules/auth/`, `apps/api/src/modules/users/`, `apps/admin/src/auth.ts`, `apps/admin/src/session.ts`, and `apps/admin/src/app/admin/(auth)/login/`.
- Organization administration: `apps/api/src/modules/organizations/` and `apps/admin/src/app/[organizationSlug]/settings/`, `apps/admin/src/app/admin/invitations/`, and `apps/admin/src/lib/features/organization/`.
- Projects: `apps/api/src/modules/projects/` and `apps/admin/src/app/[organizationSlug]/page.tsx`.
- Audit/security: `apps/api/src/modules/audit-logs/`, `apps/api/src/common/audit/`, `apps/api/src/common/security/`, and `apps/admin/src/lib/features/audit-log/`.
- Application boundaries and future scope: `README.md`, `CONTEXT.md`, `apps/admin/AGENTS.md`, and `docs/adr/`.
- Quality/delivery: `package.json`, both application manifests, `vitest.config.*`, `biome.json`, `.github/workflows/pull-request.yml`, and `docker-compose.yml`.

## Legend

- `(page)`: browser route or page entry
- `(component)`: reusable UI component or feature component
- `(API)`: backend module, controller, or use case
- `(domain)`: domain model or policy
- `(config)`: build, validation, or application configuration
- `(infra)`: persistence, CI, or runtime infrastructure
- `(test)`: automated test coverage
