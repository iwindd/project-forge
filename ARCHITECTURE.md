# Project Forge architecture

This document describes the current checkout. It is the stable guide for module boundaries, dependency direction, side effects, data flow, and test seams. Product roadmap and implementation work belong in GitHub Issues, ADRs, and `CONTEXT.md`.

## System shape

Project Forge is a private, self-hosted monorepo with two deployable applications:

```text
Browser
  -> apps/admin (Next.js dashboard)
  -> apps/api (NestJS HTTP API)
      -> PostgreSQL via MikroORM
```

The admin application is an API client. The API owns authentication, authorization, validation, business rules, state transitions, persistence, and audit/security recording. Future workers, Hermes integration, sandboxes, conversations, and GitHub App publication are not part of the current foundation.

## Repository layout

```text
project-forge/
├── apps/
│   ├── admin/                 # Next.js dashboard and organization UI
│   └── api/                   # NestJS API and persistence
├── docs/
│   ├── adr/                   # accepted architectural decisions
│   ├── agents/                # issue-tracker and domain-doc instructions
│   ├── architecture-refactor-spec.md
│   └── architecture-refactor-tickets.md
├── .github/                  # repository automation
├── CONTEXT.md                # domain glossary and access rules
├── AGENTS.md                 # repository-wide agent routing
├── docker-compose.yml        # local PostgreSQL service
├── package.json              # pnpm workspace commands
└── phase_1.md                # historical archive, not a source of truth
```

## Admin application

The Admin app lives under `apps/admin/src/`:

```text
src/
├── app/                      # App Router pages, layouts, and status boundaries
├── components/               # shell, navigation, forms, tables, and UI states
├── hooks/                    # reusable client hooks
├── lib/
│   ├── api/                  # one browser RTK Query root and typed contracts
│   ├── features/             # feature endpoints, state, and feature types
│   └── i18n/                 # next-intl request configuration
├── servers/                  # typed SSR API queries
├── themes/                   # Mantine/theme configuration
├── auth.ts                   # API-backed authentication helpers
├── proxy.ts                  # Next.js request handling and auth boundary
├── routes.ts                 # route metadata
└── session.ts                # account and organization route context
```

Browser application-data requests use the single RTK Query root with feature endpoint injection. SSR uses a separate typed server client and hydrates the existing `AppProvider`/`StoreProvider` preload boundary. Components and providers do not use raw fetch as a separate authority.

The Admin app has no ORM, database connection, private API secret, `src/app/api`, or independent authentication implementation. The API enforces authorization; client navigation visibility is not a security boundary. Organization IDs are resolved from route/API context and sent explicitly to API requests.

## API application

The API lives under `apps/api/src/`:

```text
src/
├── common/
│   ├── auth/                 # principals, sessions, and guards
│   ├── audit/                # business-audit port and adapter
│   ├── database/             # MikroORM, persistence, and UnitOfWork
│   ├── errors/               # public error mapping
│   ├── http/                 # request context and response envelopes
│   └── security/             # security-event port and adapter
├── modules/
│   ├── auth/                 # GitHub OAuth and sessions
│   ├── organizations/        # membership, roles, and invitations
│   ├── profile/              # user profile and GitHub connections
│   ├── projects/             # organization-owned project metadata
│   ├── users/                # user-facing API namespace
│   └── health/               # liveness/readiness
├── database/
│   ├── migrations/           # canonical schema migration
│   ├── migrate.ts            # explicit migration runner
│   ├── seed.ts               # explicit seed operation
│   └── verify-schema.ts      # read-only schema/invariant checks
├── app.module.ts             # application composition
└── main.ts                   # HTTP bootstrap
```

Controllers validate body, query, and route parameters at the presentation boundary and delegate to application use cases. Domain and application code depend on ports. MikroORM, PostgreSQL, and external-provider adapters remain behind infrastructure seams. Mutations use UnitOfWork; successful business audit records commit transactionally with the business change. Security failures use the separate security-event path.

## Domain authorities and data flow

```text
User ── Profile
  ├── Connection (GitHub identity)
  └── Session

Organization ── OrganizationRole
              ├── OrganizationMember ── User
              ├── OrganizationInvitation
              └── Project

AuditLog / UserSecurityLog record business and security events separately
```

Identity owns User, Profile, Connection, and Session. Organization owns members, roles, invitations, and projects. A Project belongs to exactly one Organization; active membership in that Organization grants project read/list access. Project sharing and project-specific membership are outside the current scope.

Each active Organization has exactly one immutable Owner in the current scope. Invitations may grant Admin or Member only. Archived and Suspended Organizations deny normal access. The session does not store an active Organization; the route supplies the Organization scope and the API resolves and authorizes it.

Successful JSON responses use `{ data, meta? }`. Failures use `{ error: { code, message, details, requestId } }`. Organization-owned routes are scoped as `/organizations/:organizationId/...`; auth and profile routes remain user-scoped.

## Side-effect boundaries

- Database migrations, seed operations, and schema verification are explicit commands, never application-startup or test side effects.
- Do not reset, recreate, or backfill a database without separate approval.
- Secrets and access tokens must not enter browser payloads, prompts, logs, or repository artifacts.
- Background work introduced in a later phase must persist state and event history, support idempotency, and define cancellation/recovery semantics independently of an HTTP request.

## Test seams and validation

Test externally observable behavior at the highest practical seam:

- API domain/application tests use ports and fakes.
- Persistence tests cover ORM adapters and canonical constraints.
- HTTP tests cover validation, response envelopes, request IDs, authorization, and status semantics.
- Admin tests cover the single API root, feature cache tags, preload behavior, 401/403 handling, and loading/empty/error/retry/mutation states.
- Browser acceptance tests verify the end-to-end Admin/API boundary separately from static checks.

Repository validation commands are defined by the package manifests and agent rules. The standard gates are:

```text
pnpm check
pnpm test
pnpm --filter @project-forge/admin test:browser
pnpm build
```

Run database commands only when the operation is explicitly approved and the target `DATABASE_URL` has been inspected.

## Current boundary

The implemented foundation covers GitHub-only identity, invite-only Organization membership, Organization roles and permissions, Organization-owned project metadata, audit/security foundations, and the API-backed Admin dashboard. Hermes conversations, workers, sandboxes, durable agent orchestration, review workflows, issue/PR publication, sharing, and self-host release operations remain future work and require their own approved tickets.
