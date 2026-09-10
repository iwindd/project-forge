# Project Forge

- Scanned path: `E:\Projects\project-forge`
- Generated at: `2026-09-11T00:48:24+07:00`
- Scan mode: `auto`
- Status: `complete`
- Project type: `website`
- Project type notes: Full-stack organization administration website with a Next.js browser application and a NestJS API.
- Size score: `6 / 10`

## Size rationale

This is a medium-large website workspace: two application packages, 397 tracked files, a layered API with PostgreSQL/MikroORM persistence and migrations, a substantial Next.js admin surface, 66 tracked test files, CI, Docker Compose infrastructure, OAuth and object-storage integration points, and organization/security/audit concerns. It is not yet a multi-service platform because worker, sandbox, Redis, Hermes, and GitHub App integrations are documented as future architecture rather than implemented Phase 1 capabilities.

## Detected frameworks and tooling

- TypeScript across both applications
- pnpm workspace (`apps/*`)
- NestJS 12 API with Express platform
- Next.js 16 admin application with App Router
- React 19
- MikroORM 7 with PostgreSQL
- Zod request and form validation
- Vitest test suites
- Biome root formatting/lint/check tooling; ESLint for the admin package
- Mantine UI, Redux Toolkit, next-intl, Tiptap, and Mantine DataTable in the admin client
- GitHub OAuth and AWS S3 client dependencies
- Docker Compose for local PostgreSQL
- GitHub Actions pull-request workflow

## Evidence summary

- `README.md` describes the Phase 1 API/admin split, local setup, implemented capabilities, and future architecture.
- `package.json`, `pnpm-workspace.yaml`, `apps/api/package.json`, and `apps/admin/package.json` establish the workspace and toolchain.
- `apps/api/src/modules/` contains authentication, health, organizations, projects, users, profile, and audit-log modules.
- `apps/admin/src/app/` contains login, account, organization-scoped, admin, user, role, member, invitation, audit-log, and profile routes.
- `apps/api/src/database/migrations/` records organization, role, membership, invitation, project ownership, and authentication schema evolution.
- `CONTEXT.md` and `docs/adr/` define organization scope, roles, invitations, project ownership/access, authentication boundaries, lifecycle, and audit rules.
- `.github/workflows/pull-request.yml` and `docker-compose.yml` provide CI and local infrastructure evidence.

## Limitations

- Runtime behavior, deployed infrastructure, external provider configuration, and production data were not inspected.
- Environment values were not read or persisted; only variable names from safe example files were recorded in metadata.
- Future capabilities named in planning documents (Hermes runs, sandbox provisioning, Redis workers, GitHub App, issues/PR workflows) are not classified as implemented features without source evidence.
- Working-tree changes present before initialization were preserved and not interpreted as generated Forge output.
