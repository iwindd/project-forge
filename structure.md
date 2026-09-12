# Project Forge — current project structure

เอกสารนี้เป็นภาพรวมของ checkout ปัจจุบัน โดย `apps/admin` และ `apps/api` เป็น deployable applications หลักใน monorepo แบบ pnpm

## Repository layout

```text
project-forge/
├── apps/
│   ├── admin/                       # Next.js dashboard and organization app
│   └── api/                         # NestJS API, use cases and persistence
├── infra/                           # local/self-host service definitions
├── docs/                            # ADRs, architecture and runbooks
├── .requirements/                   # archived product input
├── CONTEXT.md                       # current domain glossary and rules
├── PROJECT_FORGE.plan               # roadmap
└── phase_1.md                       # historical archive notice
```

## Admin application

```text
apps/admin/src/
├── app/
│   ├── (web)/                       # public/auth/account/organization route group
│   │   ├── (auth)/login/            # GitHub login
│   │   ├── account/                 # profile and activity
│   │   └── [organizationSlug]/     # organization-scoped dashboard
│   │       ├── projects/
│   │       ├── audit-logs/
│   │       └── settings/
│   │           ├── members/
│   │           └── roles/
│   └── global-error.tsx
├── components/                      # shell, navigation, profile and UI states
├── hooks/                           # client hooks
├── lib/
│   ├── api/                         # one browser RTK Query root
│   └── features/                    # injected feature endpoints and state
├── servers/                         # typed SSR API queries
└── session.ts                       # account/org route context
```

The Admin app has no database access, ORM import, private API secret, or independent application-data fetch path. Organization IDs are resolved from the route/API context and sent explicitly to the API. The API, not navigation visibility, enforces authorization.

## API application

```text
apps/api/src/
├── common/
│   ├── auth/                         # principal, session and guards
│   ├── audit/                        # business audit port and adapter
│   ├── database/                     # MikroORM, persistence and UnitOfWork
│   ├── errors/                       # public error mapping
│   ├── http/                         # request context and envelopes
│   └── security/                     # security-event port and adapter
├── modules/
│   ├── auth/                         # GitHub OAuth and sessions
│   ├── organizations/                # membership, roles and invitations
│   ├── profile/                      # user profile and connections
│   ├── projects/                     # organization-owned metadata
│   ├── users/                        # platform user API namespace
│   └── health/                       # liveness/readiness
└── database/
    ├── migrations/                   # canonical schema transition
    ├── migrate.ts                    # explicit migration runner
    └── seed.ts                       # explicit seed operation
```

Controllers validate input and delegate to use cases. Domain/application code depends on ports; ORM and provider adapters stay in infrastructure. Mutations use UnitOfWork and write successful business audit events transactionally.

## Canonical database model

The latest migration and current ORM entities describe these authorities:

```text
User ── Profile
  ├── Connection (GitHub identity)
  └── Session

Organization ── OrganizationRole
              ├── OrganizationMember ── User
              ├── OrganizationInvitation
              └── Project

AuditLog / UserSecurityLog record platform and organization events
```

Organization membership is the only Organization admission model. An invitation grants `ADMIN` or `MEMBER`; the seeded creator is the sole immutable `OWNER`. Project access follows active membership in the owning Organization, with no separate project-sharing authority.

The canonical migration is DDL-only: it removes obsolete authority sources and defines explicit foreign keys, unique constraints, invitation uniqueness, role assignment constraints, and an Owner membership guard. The former incremental migration files are not an active upgrade path because this schema is intentionally disposable and is recreated without backfill.

## Explicit operations

```text
pnpm db:migrate
pnpm --filter @project-forge/api db:seed
pnpm db:verify
pnpm check-types
pnpm lint
pnpm test
```

Migration, seed, and schema verification commands are never run implicitly by application startup or tests. Do not reset, recreate, or backfill a database without a separately approved operation. `db:verify` is read-only but requires the seeded GitHub user ID.

## Phase boundaries

Phase 1 stops at GitHub identity, invite-only Organization access, roles, project metadata, audit/security foundations, and the responsive dashboard. Workers, Hermes, conversations, sandboxes, review agents, issue publication, and pull-request publication are future modules and must not be introduced through the Phase 1 foundation.
