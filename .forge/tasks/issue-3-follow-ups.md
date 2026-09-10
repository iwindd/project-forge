# Issue #3 — deferred review findings (draft follow-up issues)

Items raised by review, or discovered while fixing the local environment, that were **not** fixed
in issue #3 because each one refactors code outside its scope or is an operational concern.

Nothing here has been filed. No issue has been created.

---

## Proposed issue 4 — the API serves 500s when the database schema is behind the code

- Type: `chore` / developer experience
- Discovered: while reproducing the reported "can't create a project" failure locally.

### Evidence
On a local checkout whose database had only the first three migrations applied, every Project
endpoint failed with an opaque 500:

```
GET /api/v1/organizations/{id}/projects  ->  500
{"error":{"code":"INTERNAL_SERVER_ERROR","message":"Internal server error","requestId":"ba5672d5-..."}}
```

The server-side cause was `MikroORM InvalidFieldNameException: column p0.organization_id does not
exist` — the `projects` table still had `owner_id` and no `organization_id`, because the five
`migration-2026091012...` through `migration-2026091016...` migrations had never been applied. The
admin UI correctly rendered its error state with a retry button, and create failed for the same
reason. Applying `pnpm db:migrate` fixed everything with no code change.

### Why it matters
The failure is silent and unattributable from the outside: a client gets a bare
`INTERNAL_SERVER_ERROR` with no hint that the schema is stale, and nothing in the API warns at boot.
A developer who pulls the branch and forgets `pnpm db:migrate` sees feature endpoints 500 with no
actionable signal.

### What to build
- At API start-up, compare applied migrations against the migration directory and log a clear
  warning (or fail fast in development) when migrations are pending.
- Optionally map `InvalidFieldNameException` / `UndefinedTableError` to a distinguishable error code
  such as `SCHEMA_OUT_OF_DATE`.
- Document `pnpm db:migrate` as a required step in the local setup path.

### Acceptance criteria
- Starting the API against a database with pending migrations produces an explicit, actionable
  message naming the pending migrations.
- A missing-column/table error is no longer indistinguishable from an unrelated internal error.
- Local setup documentation states the migration step.

### Out of scope
Changing any migration, and changing the Project behaviour itself.

### Review note
A round-3 reviewer judged the bare `INTERNAL_SERVER_ERROR` for a schema-mismatch SQL error to be
**acceptable and not a defect** of issue #3: the ADR 0003 envelope contract is met, and a dedicated
`SCHEMA_OUT_OF_DATE` code would be reachable only from a misconfigured local database. The
actionable part is boot-time diagnostics plus documentation, which is what this issue covers.

---

## Proposed issue 5 — tracked generated artifacts drift from the schema and the toolchain

- Type: `chore`
- Discovered: alongside the item above, and by a round-3 reviewer.

### Evidence
1. `apps/api/src/database/migrations/.snapshot-project_forge.json` is tracked on `main`, but at the
   time of discovery it described a schema **older** than the migrations: it still listed
   `access_requests`, `project_members`, `oauth_accounts` and `projects.owner_id`, and omitted
   `projects.organization_id`. `git diff main...HEAD --quiet` against that file reports IDENTICAL, so
   this is pre-existing and not introduced by issue #3. Running `pnpm db:migrate` rewrote it
   (240 insertions / 382 deletions); that rewrite was reverted so it does not pollute the issue #3
   diff. `pnpm db:generate` (`mikro-orm migration:create`) diffs the entities against this snapshot,
   so on a clean checkout it can emit DDL for changes that are already applied.
2. `apps/admin/next-env.d.ts` is likewise tracked and generated: it flips between
   `./.next/dev/types/...` and `./.next/types/...` depending on whether the last Next command was
   `dev` or `build`, so it dirties the working tree after an admin build regardless of the task.
   `biome.json` already excludes it from formatting, which suggests the ambiguity was noticed.

### What to build
Decide and document the convention for each artifact, then make it hold:
- For the snapshot: either regenerate it after applying all migrations and commit it, or stop
  tracking it and document that it is local state.
- For `next-env.d.ts`: either keep it ignored, or add a post-build restore step to the documented
  verification flow so an admin build never leaves a dirty tree.

### Acceptance criteria
- `pnpm db:generate` on a clean checkout produces no spurious migration.
- An admin `build` followed by `git status` leaves the tree clean, or the deviation is documented as
  intentional.
- The chosen conventions are stated in the API and Admin documentation.

### Out of scope
Editing existing migrations, and changing any application behaviour.

---

## Proposed issue 6 — `biome check --write` can silently break NestJS dependency injection

- Source: `STD-012` (Standard, low) from review round 3
- Type: `chore` / tooling safety

### Evidence
Biome reports `lint/style/useImportType` on value imports of class types used as constructor
parameter types without `@Inject()`, for example
`apps/api/src/modules/projects/application/use-cases/create-project-use-case.ts:10`, flagged with
"Safe fix: Use import type". The fix is **not** safe here: `apps/api/tsconfig.json` sets
`emitDecoratorMetadata: true` and the parameter carries no `@Inject()`, so Nest resolves it from
`design:paramtypes`. Compiling a minimal repro with the repository's TypeScript 5.9.3 confirms the
value import emits `__metadata("design:paramtypes", [dep_js_1.Dep])` while the type-only form emits
`__metadata("design:paramtypes", [Function])` — the DI token is lost and injection breaks at runtime,
with no compile error. Biome 2.5.12's `useImportType` exposes only a `style` option and is not
decorator-metadata aware, so it cannot be made correct by configuration of the rule itself. The
pattern is pervasive across the API package and pre-dates issue #3.

### What to build
Disable `style/useImportType` for `apps/api/src/**` via a `biome.json` override (or add per-file
suppressions naming `emitDecoratorMetadata` as the reason), so `biome check --write` /
`biome lint --write` can never apply this fix to NestJS injection sites. Record the reason next to
the configuration so a future reader does not "restore" the rule.

### Acceptance criteria
- `biome check --write` on `apps/api/src` no longer rewrites class-typed constructor imports.
- The remaining warnings for the API package are explainable, and the configuration states why the
  rule is off there.
- API lint, tests, typecheck and build all still pass.

### Out of scope
Rewriting DI to use explicit `@Inject()` tokens everywhere.

---

## Proposed issue 1 — extract the shared Admin PostgreSQL UUID schema

- Source finding: `STD-005` (Standard, low)
- Type: `chore` / `refactor`
- Evidence: `apps/admin/src/lib/features/project/project-schemas.ts:7-11` re-declares
  `postgresUuidPattern` and `export const databaseUuidSchema` verbatim from
  `apps/admin/src/lib/features/organization/organization-schemas.ts:4-8`. Two modules now export an
  identically named schema that must stay in lockstep. The API already single-sources the same rule
  in `apps/api/src/common/http/database-uuid.schema.ts`.

### What to build
Promote the pattern to one shared Admin module (`apps/admin/src/lib/api/database-uuid.schema.ts`),
import it from both feature schemas, and remove the two local copies. Mirror the API's
single-source placement, since `apps/admin/AGENTS.md` requires the frontend and backend schemas to
mirror each other's rules.

### Acceptance criteria
- One Admin module owns the PostgreSQL UUID-shaped schema.
- `organization-schemas.ts` and `project-schemas.ts` both import it; no local duplicate remains.
- `pnpm --filter @project-forge/admin typecheck`, `lint`, `test` and `build` pass.

### Out of scope
Changing the UUID rule itself, and changing any API schema.

### Follow-up review notes
- Evidence pointer: `apps/admin/src/lib/features/project/project-schemas.ts:7-11`.
- The copied `databaseUuidSchema` is exported but used only inside its own module (flagged by
  `pnpm --filter @project-forge/admin knip`, which is not a CI gate). Removing or relocating it
  belongs to this issue.

---

## Proposed issue 2 — extract the shared Admin table/card/empty-state CSS

- Source finding: `STD-008` (Standard, low, duplication)
- Type: `chore` / `refactor`

### Evidence
The `.page`, `.card`, `.tableScroll`, `.table`, `.table th`, `.table td`, `.table tbody tr:last-child td`
and `.emptyState` rule set is repeated across three page modules:
`settings/members/members-page.module.css`, `settings/roles/roles-page.module.css` and
`[organizationSlug]/projects/projects-page.module.css`.

**Correction to an earlier claim (raised as `STD-013`):** an earlier draft of this issue called the
three copies "byte-identical". They are **near-identical with per-page overrides**, and the
difference matters to the planned extraction:
- `.table { min-width }` is `48rem` in projects, `44rem` in roles and `42rem` in members.
- `.emptyState { min-height }` is `10rem` in projects, `12rem` in roles and `10rem` in members.
- members namespaces the card class as `.inviteCard, .membersCard` while projects and roles use `.card`.

Only `.page`, `.tableScroll` and the cell-level table rules are literally identical.

### What to build
Extract the shared rules into one module under `src/components` (or a shared admin CSS module) and
have all three pages import it, parameterising the divergent values (table `min-width`,
empty-state `min-height`) so the extraction cannot silently change layout.

### Acceptance criteria
- The shared block exists in one place and is consumed by the members, roles and projects pages.
- Table `min-width` and empty-state `min-height` keep their current per-page values via a custom
  property or an explicit per-page override.
- `pnpm --filter @project-forge/admin build` plus the admin lint/typecheck gates pass.
- No visual regression on the three pages.

### Out of scope
Redesigning any page, or introducing a CSS framework or design-system change.

---

## Proposed issue 3 — make `project.manage` a first-class Admin permission

- Source finding: `STD-009` (Standard, low, consistency)
- Type: `refactor`
- Evidence: `apps/admin/src/lib/features/project/project-permissions.ts:2` hardcodes
  `PROJECT_MANAGE_PERMISSION = 'project.manage'` and tests `role.permissions.includes(...)`
  directly. The string is also spelled out in `settings/roles/role-form-schema.ts:4`,
  `features/organization/organization-members-api.ts:21` and `organization-schemas.ts:102`, while
  `apps/admin/src/lib/permissions.ts` owns the `PERMISSIONS` map and the `PermissionKey` union that
  route and navigation `permission`/`permissionKey` values resolve through — and
  `getPermissionsForUser` can only ever grant `manageOrganization` (or `*`), so a member whose role
  carries only `project.manage` maps to `[]`.

Functionally the Projects screen behaves correctly today because the API does return `project.manage`
in `role.permissions`; this is a single-source-of-truth consistency issue, not a live defect.

### What to build
Add `manageProject: 'project.manage'` to `PERMISSIONS`, surface it through `getPermissionsForUser`
and `hasPermission`, and derive `canManageProjects` from the registry while keeping the `isOwner`
bypass that mirrors `OrganizationService.requireProjectManager`. Replace the other hardcoded
occurrences with the registry entry.

### Acceptance criteria
- `project.manage` is resolved through the Admin permission registry, not feature-local constants.
- The Projects navigation and mutation controls behave exactly as they do today for owner, admin
  (`project.manage`) and read-only member roles.
- `pnpm --filter @project-forge/admin` lint, typecheck, test, `check:admin-client-boundary` and
  `build` pass.

### Out of scope
Changing the API's authorization model, and changing which roles hold `project.manage`.
