# Project Forge architecture refactor specification

Status: proposed. This is the formal specification synthesized from the completed architecture interview. It covers the current `apps/admin` and `apps/api` checkout only. It does not authorize source-code changes or a database reset.

## Problem Statement

Project Forge has moved from the legacy frontend application to `apps/admin`, but the current frontend and backend boundaries still reflect an earlier architecture. The admin application has multiple independent RTK Query APIs, raw browser fetches in components and providers, localStorage-driven organization scope, and server fetches that rely on unchecked TypeScript casts. The API has controllers and a large organization service that perform ORM queries and business decisions directly, inconsistent validation and response shapes, and overlapping identity/session/organization concepts.

This makes organization authorization difficult to reason about, makes API behavior hard to test consistently, and makes the preserved admin UI dependent on implementation details that are difficult to change safely. Active documentation and scripts also still refer to the removed frontend application.

## Solution

Refactor the current admin/API system around explicit organization ownership, a single API transport model, and strict module boundaries.

The API will use Identity, Access, Organization, Project, Audit/Security, and Health modules. Domain and application logic will depend on ports; infrastructure will contain ORM and external adapters; presentation will validate requests and map use-case results to a single HTTP contract. Mutations will execute through UnitOfWork and record successful business audit events transactionally.

The admin application will retain Mantine, the current shell/header/sidebar, navigation labels, navigation modes, `AppProvider`, `StoreProvider`, and the existing server preload flow. Browser calls will use one RTK Query API root with feature endpoint injection. SSR will use a typed server client and feed the initial route's required data through the existing provider `preloadedState` boundary.

## User Stories

1. As an authenticated user, I want my identity, profile, GitHub connection, and session to be represented consistently, so that login and account behavior have one clear model.
2. As an authenticated user, I want my session to identify me without storing an active organization, so that authorization cannot depend on stale session selection.
3. As an authenticated user, I want to navigate to an organization by its route context, so that the organization I am viewing is explicit and shareable.
4. As an active organization member, I want to read and list projects belonging to my organization, so that project access follows the organization boundary.
5. As a user outside an organization, I want project requests to be denied or not found, so that project data cannot cross organization boundaries.
6. As an organization creator, I want to become the sole Owner automatically, so that a new organization always has an accountable authority.
7. As an organization Owner, I want built-in roles to be present when the organization is created, so that membership administration works immediately.
8. As an organization administrator, I want to invite users as Member or Admin, so that I can grow the organization without granting Owner authority.
9. As an invited user, I want expired, cancelled, or invalid invitations to be rejected clearly, so that invitation state is predictable.
10. As an organization administrator, I want a repeated invitation to rotate its token and expiry, so that only the newest pending invitation remains usable.
11. As an organization administrator, I want to manage organization membership and roles through `manageOrganization`, so that membership policy is separate from project mutation policy.
12. As an organization administrator, I want to create, update, archive, and otherwise manage projects through `manageProject`, so that project mutations are permission-controlled.
13. As an active organization member, I want project read/list access without a separate project membership, so that the first release does not implement project sharing.
14. As a maintainer, I want exactly one immutable Owner per active organization, so that there is no ambiguous or multiple-owner state.
15. As a maintainer, I want archived and suspended organizations to deny normal access, so that lifecycle state is enforced consistently.
16. As an admin user, I want all application requests to use one browser API root, so that caching, invalidation, auth errors, and response parsing are consistent.
17. As an admin user, I want feature endpoints to be injected into the root API, so that adding a feature does not create another independent cache and middleware stack.
18. As an SSR page, I want to use a typed server client, so that server requests do not rely on unchecked response casts.
19. As an SSR page, I want initial route data to use the existing `AppProvider`/`StoreProvider` preload flow, so that the current provider and UI architecture remains intact.
20. As an admin user, I want a 401 response to clear session/cache state and redirect me to login once, so that stale authentication does not leave the UI in an invalid state.
21. As an admin user, I want a 403 response to remain a typed forbidden state, so that the UI can explain insufficient permission without incorrectly sending me to login.
22. As an admin user, I want loading, empty, error, retry, and mutation feedback states to be consistent, so that every feature communicates its current state clearly.
23. As an API consumer, I want successful JSON responses to use `{ data, meta? }`, so that singular and collection responses are predictable.
24. As an API consumer, I want failures to use a stable error code, message, details, and request ID, so that browser and server clients can handle errors uniformly.
25. As an API maintainer, I want body, query, and route parameters validated at the HTTP boundary, so that invalid input cannot leak into application logic.
26. As an API maintainer, I want output contracts checked at runtime, so that TypeScript casts cannot hide server contract drift.
27. As a maintainer, I want business mutations and successful business audit records to commit together, so that audit history cannot claim a change that did not persist.
28. As a maintainer, I want security failures treated separately from business audit events, so that security monitoring has the right semantics.
29. As a maintainer, I want domain/application code independent of NestJS and MikroORM, so that use-cases can be tested through ports and adapters.
30. As an admin maintainer, I want frontend and backend schemas to remain separate while contract tests verify their compatibility, so that the monorepo does not become coupled through a shared runtime schema package.
31. As a maintainer, I want active docs and scripts to describe `apps/admin` and `apps/api`, so that new contributors do not follow removed frontend workflows.
32. As an existing admin user, I want the current AdminShell, AppHeader, sidebar, Mantine styling, labels, and `app/admin/account` navigation modes preserved, so that architecture work does not regress the existing UI.

## Implementation Decisions

### Domain and persistence

- Identity owns User, Profile, Connection, and Session.
- `connections` is the canonical external identity model; GitHub is the only supported provider in this scope.
- Session has no active organization field.
- Organization owns projects, members, roles, and invitations.
- Organization role codes are `OWNER`, `ADMIN`, and `MEMBER`, with Thai seed labels `เจ้าของ`, `แอดมิน`, and `สมาชิก`.
- Exactly one Owner exists per organization. The current scope has no ownership transfer; an active Owner cannot be suspended, removed, or downgraded.
- Custom organization roles may receive explicit permissions. Built-in roles cannot be deleted or made inconsistent.
- `manageOrganization` governs membership, invitations, and organization-role administration.
- `manageProject` governs project mutations. Active members of the owning organization have read/list access.
- Project belongs to exactly one Organization. Project sharing, project roles, project owners, and `project_members` are out of scope.
- Normal project removal is archive/reversible. Public hard delete is out of scope.
- Only Active organizations are available to members. Archived and Suspended organizations deny normal access.
- Invitations may grant Member or Admin only. There is one pending invitation per organization/email pair; resending rotates token and expiry.

### Backend seams and modules

- The highest backend test seam is the HTTP boundary: request validation → application use-case → port-backed adapter → response contract.
- Identity, Access, Organization, Project, Audit/Security, and Health are separate modules.
- Each module may contain domain, application ports/use-cases, infrastructure adapters, and presentation boundary code.
- Domain code has no framework or ORM dependency.
- Controllers validate/map and delegate; they do not contain business logic or query ORM directly.
- Application use-cases depend on repository/query/policy ports.
- Access evaluates policy using organization facts supplied through ports; it does not own a second permission store.
- All mutations run through UnitOfWork.
- Successful business mutations write through AuditPort in the same UnitOfWork. Security failures use a separate security-audit policy.
- Reads use query/read ports and do not hold a long transaction unless snapshot consistency is required.

### HTTP contract

- JSON success is `{ data, meta? }`.
- Collections use `data: []` and pagination metadata containing `page`, `pageSize`, `total`, and `totalPages`.
- JSON failure is `{ error: { code, message, details, requestId } }`.
- Body, query, and route parameters use Zod at the presentation boundary.
- Backend output schemas and frontend response schemas are runtime-checked independently.
- Mutations return the success envelope, including `{ data: null }` where appropriate; public JSON APIs do not add a separate 204 client path.
- Binary export success remains a file response; export failures use the common error envelope.
- Organization-owned resources use `/organizations/:organizationId/...` routes. Auth/profile remain user-scoped.
- `/auth/me` returns identity/profile/session state only. `/organizations` returns organization memberships, role codes, labels, and permissions.

### Admin seams and transport

- The highest frontend seam is the API transport boundary: typed server client or browser RTK Query root → feature endpoint → existing provider/store/UI.
- There is exactly one RTK Query API root. Feature modules use endpoint injection only.
- The typed server API client is separate from browser RTK Query transport.
- Initial route queries are preloaded through the existing `AppProvider`/`StoreProvider` `preloadedState` flow; no second provider or hydration mechanism is introduced.
- `OrganizationProvider` remains a UI context. It derives organization from route/API state and does not use localStorage or raw fetch as authority.
- The URL keeps the organization slug for navigation; requests carry the resolved organization ID explicitly.
- Browser application-data requests do not use raw fetch from components/providers.
- A centralized auth boundary handles 401 cache/session clearing and login redirect; 403 remains typed UI state.
- Existing admin shell, header, sidebar, Mantine, labels, and navigation modes remain unchanged unless a feature state requires a scoped adjustment.

### Schema strategy

- No database reset, migration execution, or seed execution is part of this spec phase.
- After approval, recreate the un-deployed schema and seed new data; do not backfill current disposable records.
- The active migration path is one DDL-only canonical migration; its explicit read-only `db:verify` companion checks named schema invariants and seeded records without changing the database.
- The approved schema removes `projects.ownerId`, `project_members`, `organizations.ownerId`, legacy organization/invitation role columns, `sessions.active_organization_id`, and the parallel `oauth_accounts` identity model.
- The approved schema requires project organization ownership, role assignment, invitation uniqueness, and explicit foreign keys/indexes.
- Breaking changes are allowed; no compatibility layer is required.

## Testing Decisions

- Tests assert externally observable behavior at the highest practical seam and avoid coupling to ORM implementation details.
- Backend domain/application tests use ports and fakes; persistence tests verify ORM adapters; HTTP contract tests verify validation, envelopes, request IDs, and status semantics.
- Organization tests cover one Owner, role permissions, membership status, invitation rotation/expiry, organization status, and organization-scoped access.
- Project tests cover organization ownership, active-member read/list access, `manageProject` mutation authorization, archive behavior, and cross-organization denial.
- Audit tests verify successful business audit atomicity and separate security-audit behavior.
- Admin tests use the single API root and independent schemas; feature tests verify cache tags, explicit organization IDs, 401/403 lifecycle, preload behavior, and UI states.
- Contract fixtures/tests verify frontend/backend compatibility without importing a shared runtime schema package.
- Existing package test patterns and current API/admin test suites are the prior art to extend.
- Static validation and live browser/API/database verification are reported separately.

## Out of Scope

- Recreating or maintaining the removed frontend application.
- Phase 1 product requirements that do not describe the current admin/API idea.
- Project sharing, project roles, project owners, and project-specific member lists.
- Multiple external identity providers beyond GitHub.
- Owner transfer or multiple Owners.
- Public hard delete for projects.
- A shared runtime schema package.
- Database reset, migration execution, seed execution, or data backfill before explicit approval.
- Deploy, production migration, or compatibility support for an already-deployed version.

## Further Notes

- The glossary and accepted decisions are recorded in `CONTEXT.md` and `docs/adr/`.
- The approved local ticket set is indexed by `docs/architecture-refactor-tickets.md`, with one ready-for-agent file per ticket under `.scratch/project-forge-architecture-refactor/issues/`.
- The approved ticket set is published as GitHub Issues #1–#8 with native blocking dependencies; local mirrors remain under `.scratch/project-forge-architecture-refactor/issues/`.
