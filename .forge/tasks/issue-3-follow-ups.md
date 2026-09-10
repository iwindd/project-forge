# Issue #3 — deferred review findings (draft follow-up issues)

Three `Standard` findings from the review of `04f6676` were not corrected, because each one
consolidates pre-existing Admin shared primitives and its fix refactors code outside issue #3's
scope. They are drafted here for the user to approve before anything is filed on GitHub.

Nothing has been filed. No issue has been created.

---

## Proposed issue 1 — extract the shared Admin PostgreSQL UUID schema

- Source finding: `STD-005` (Standard, low)
- Type: `chore` / `refactor`
- Evidence: `apps/admin/src/lib/features/project/project-schemas.ts:4-8` re-declares
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

### Follow-up review notes (round 2)
- The primary evidence reference is now `apps/admin/src/lib/features/project/project-schemas.ts:7-11`
  (it drifted from `:4-8` when STD-002 moved `MASKED_ENVIRONMENT_METADATA_VALUE`).
- The copied `databaseUuidSchema` is exported but unused (flagged by `pnpm --filter
  @project-forge/admin knip`, which is not a CI gate). Removing or relocating it is part of this
  issue's scope, so `knip`'s unused-export report for the project feature should shrink by one here.

---

## Proposed issue 2 — extract the shared Admin table/card/empty-state CSS

- Source finding: `STD-008` (Standard, low, duplication)
- Type: `chore` / `refactor`
- Evidence: `apps/admin/src/app/[organizationSlug]/projects/projects-page.module.css:1-67` is a
  third byte-identical copy of the `.page`, `.card`, `.tableScroll`, `.table` and `.emptyState`
  block already present in `settings/roles/roles-page.module.css` and
  `settings/members/members-page.module.css`.

### What to build
Extract the shared table/card/empty-state rules into one module under `src/components` (or a shared
admin CSS module) and have all three pages import it, so a fourth page does not become a fourth
copy.

### Acceptance criteria
- The shared block exists in exactly one place and is consumed by the members, roles and projects pages.
- `pnpm --filter @project-forge/admin build` and the admin lint/typecheck gates pass.
- No visual regression on the three pages (compare with the styles applied today).

### Out of scope
Redesigning any page, or introducing a CSS framework or design-system change.

---

## Proposed issue 3 — make `project.manage` a first-class Admin permission

- Source finding: `STD-009` (Standard, low, consistency)
- Type: `refactor`
- Evidence: `apps/admin/src/lib/features/project/project-permissions.ts:1-16` hardcodes
  `PROJECT_MANAGE_PERMISSION = 'project.manage'` and tests `role.permissions.includes(...)`
  directly. `apps/admin/src/lib/permissions.ts` is the Admin permission registry that owns the
  `PERMISSIONS` map, the `PermissionKey` union and `getPermissionsForUser`/`hasPermission` that
  route and navigation `permission`/`permissionKey` values resolve through — and
  `getPermissionsForUser` can only ever grant `manageOrganization` (or `*`), so a member whose role
  carries only `project.manage` maps to `[]`. Today this is contained because `src/routes.ts` gives
  the `projects` route no `permission` and the API is the authorization boundary, but the next
  permission-gated project route cannot be expressed through the registry.

### What to build
Add `manageProject: 'project.manage'` to `PERMISSIONS`, surface it through `getPermissionsForUser`
and `hasPermission`, and derive `canManageProjects` from the registry while keeping the `isOwner`
bypass that mirrors `OrganizationService.requireProjectManager`.

### Acceptance criteria
- `project.manage` is resolved through the Admin permission registry, not a feature-local constant.
- The Projects navigation and mutation controls behave exactly as they do today for owner, admin
  (`project.manage`), and read-only member roles.
- `pnpm --filter @project-forge/admin` lint, typecheck, test, `check:admin-client-boundary` and
  `build` pass.

### Out of scope
Changing the API's authorization model, and changing which roles hold `project.manage`.
