<!-- forge-review-ledger -->
# Review ledger — issue #3 `Organization-scoped project lifecycle`

Tracked review history for branch `issue/3-organization-scoped-project-lifecycle`.

This is the durable review record. On the Pull Request the same content is posted as a single
tracked comment, so later review rounds **update that one comment** rather than adding new ones.
The repository copy mirrors it for local and offline review.

Rows are never deleted, only appended and re-statused.

> **Tracking note (PROC-001, resolved):** this file, `.forge/tasks/issue-3.yaml` and
> `.forge/tasks/issue-3-follow-ups.md` are committed to the branch, matching the repository's
> existing convention of tracking other `.forge/` metadata (`scan.json`, `project.md`,
> `features.md`). They were working-tree-only during review round 1, which is why they are absent
> from the per-finding commits.
>
> Branch `issue/3-organization-scoped-project-lifecycle` was pushed and opened as draft Pull
> Request **#13** (https://github.com/iwindd/project-forge/pull/13). This file is mirrored as the
> `forge-review-ledger` comment on that Pull Request.
>
> **Correction (PROC-002):** earlier revisions of this file described the CI-verified commit as
> "identical to the local branch HEAD". That was true when written and became stale as the ledger
> itself was committed. The accurate statement is that CI is verified green on `233826e`, and the
> current HEAD differs from it **only** by documentation changes under `.forge/tasks/` — no source
> file differs between the two. Verified with
> `git diff --name-only 233826e <HEAD> -- . ':!.forge/tasks'` returning nothing.

---

## Review #1 — initial gate

- Timestamp: `2026-09-11T01:51:02+07:00` (dispatched) / `2026-09-11T01:56:28+07:00` (reported)
- Reviewed commit: `04f6676f0304f219abc09e438a86a613569add9e`; base `main` @ `decb2c9`
- Workers: `review-spec` (SPEC-001..004), `review-standard` (STD-001..009), in parallel

| Review | Result |
| --- | --- |
| Spec | findings — 7 PASS, 2 PARTIAL, 0 FAIL. AC-5 PARTIAL (branch/runtime propagation and update-side masking untested → SPEC-001). AC-6 PARTIAL (no 401, no route-level 403, no archived-read, no HTTP-level spec → SPEC-002). Two low defects: owner/repo casing not canonicalized (SPEC-003); request ID minted twice (SPEC-004) |
| Standard | findings — no blocker, no hard rule violation. One medium secret-handling defect reproduced by execution (STD-001) plus eight low items. Six items it checked and confirmed pre-existing on `main` were correctly not raised |

---

## Review #2 — post-correction re-review

- Dispatched `2026-09-11T02:32:13+07:00`, reported `2026-09-11T02:42:37+07:00`
- Reviewed commit: `c88a528`; workers: `review-spec`, `review-standard`, `review-follow-up`

| Review | Result |
| --- | --- |
| Spec | All four round-1 corrections verified resolved (re-ran the suites: 12 files / 72 projects+http tests). 9 of 9 acceptance criteria PASS. One new HIGH finding: SPEC-005. Observations not raised as findings: the AC-10 `updatedAt` DESC ordering asserted nowhere; no HTTP-level cross-organization case |
| Standard | No regression, no new defect, no hard rule violation. All six corrected findings and all three deferrals re-verified; all four accepted residuals confirmed acceptable. One new medium finding: STD-010, identical to SPEC-005 and verified pre-existing on `main` |
| Follow-up | **No regressions.** All 11 prior findings genuinely resolved. Three new low items: SPEC-003N, STD-005N, PROC-001 |

---

## Review #3 — fresh pass after the browser verification

- Dispatched `2026-09-11T03:22:14+07:00`, reported `2026-09-11T03:30:51+07:00`
- Reviewed commit: `aa0823a`; workers: `review-spec`, `review-standard`, `review-follow-up`
- New input supplied to this round: real GitHub CI green on `233826e` and `aa0823a`; the
  user-reported failure reproduced and found to be a **stale local database** (3 of 8 migrations
  applied, `projects.owner_id` present and `organization_id` missing), fixed by `pnpm db:migrate`
  with zero source changes; and a full browser walkthrough of the feature at `aa0823a`.

| Review | Result |
| --- | --- |
| Spec | No high or medium defect; all 10 criteria PASS; all 18 prior IDs verified resolved, deferred or dismissed. **4 new low findings**: SPEC-101 (PROJECT_UPDATED audit omits repository fields), SPEC-102 (Project list returns no pagination metadata), SPEC-103 (repeated archive/restore is a no-op only sequentially), SPEC-104 (dead project-scoped cache-tag invalidation) |
| Standard | Pass with findings; no blocker, no hard rule violation, no regression. **4 new low findings**: STD-011 (a bare pasted identifier-shaped secret is stored as an environment key name), STD-012 (the ledger overstated API lint cleanliness, and Biome's `useImportType` "safe fix" would break NestJS DI), STD-013 (the deferred-CSS evidence claimed "byte-identical" copies that are only near-identical), STD-014 (no HTTP-level test for the archive/restore routes) |
| Follow-up | **No regressions.** All 17 prior findings preserved in their recorded status; the two commits since round 2 (`eb35dc6`, `aa0823a`) are documentation-only, with `git diff --name-only e9a9128 aa0823a` containing no source file. **3 new findings**: STD-011 (duplicate of the Standard finding), PROC-002 (stale reviewed-SHA claim in this ledger), PROC-003 (the committed follow-ups file lagged the working tree) |

---

## Findings (cumulative) — status

### Round 1 and 2

| ID | Type | Severity | Finding | Status | Resolving commit(s) | Resolution evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SPEC-001 | Spec | medium | AC-5: branch/runtime propagation and update-side masking untested | resolved | `38343af` | create spec asserts sourceBranch/targetBranch/nodeVersion on the saved record plus schema defaults; update spec asserts branch/nodeVersion on the record and in audit before/after and executes the update-side masking branch |
| SPEC-002 | Spec | medium | AC-6: no 401, no route-level 403, no archived-read, no HTTP-level spec | resolved | `14a4bf5` | `projects.http.spec.ts` boots the real controller, `SessionGuard`, use cases and `PublicErrorFilter`; covers 401, 403 non-member and without `project.manage`, 404 project and organization, 409 archived-update and duplicate repository, archived read |
| SPEC-003 | Spec | low | owner/repo casing not canonicalized | resolved | `eec05ab`, `afce457` | owner and name lowercased; `.git` stripped after lowercasing so `ACME/DEMO.GIT` collapses to `acme/demo`; domain + use-case tests. No backfill needed — see SPEC-003N |
| SPEC-004 | Spec | low | request ID minted twice per request | resolved | `cc03c6a` | `getRequestId` memoizes on the express `Request`; `request-context.spec.ts` covers repeated calls, inbound header, blank header, distinct requests |
| SPEC-005 | Spec | high | a partial PATCH silently overwrites every omitted field | resolved | `5ad2602`, `e9a9128` | `updateProjectSchema` rebuilt as an explicit all-optional object with NO defaults over shared default-free field shapes; schema-level discriminating test plus three HTTP regression tests. Forge re-ran an independent probe: omitted fields now parse to `undefined`; create defaults intact |
| STD-001 | Standard | medium | Admin env field stores a pasted `KEY=value` line — including the secret — as the key name | resolved | `2a48ce3` | `variableNameOf` splits at the first `=`; names filtered by `^[A-Za-z_][A-Za-z0-9_]*$`; API schema constrains keys identically; Thai copy forbids pasting values. Its unclosed remainder is now tracked as STD-011 |
| STD-002 | Standard | low | client schema does not enforce masked values | resolved | `061b274` | `z.record(z.string(), z.literal('configured'))`; positive, negative and non-string cases that discriminate |
| STD-003 | Standard | low | archive "real prior status" test cannot fail | resolved | `f443fef` | falsifiable-by-construction test deleted; the guarantee is covered discriminatingly on the restore path |
| STD-004 | Standard | low | failure paths and screen state logic unverified | resolved | `034247e` | view-state and failure mapping extracted and tested; fetch stub status-parameterisable with 403/404/409; restore spec uses a real `ForbiddenError` |
| STD-005 | Standard | low | Admin PostgreSQL-UUID schema duplicated from the organization feature | deferred | — | Fix needs a shared Admin module and touches the organization feature. Drafted as proposed issue 1 in `issue-3-follow-ups.md` |
| STD-006 | Standard | low | concurrent duplicate returns 500 instead of 409 | resolved | `6c8dc2d` (supersedes `aa4e105`) | First attempt caught around `save`, which cannot fire because `save` never flushed. Corrected fix flushes inside the adapter and translates `UniqueConstraintViolationException` at the real failure point; port documents the flush-and-throw contract; no `@mikro-orm/*` remains in `application/**` or `domain/**` |
| STD-007 | Standard | low | dead client surface and unused exports | resolved | `c88a528` | `getProject` endpoint and `useGetProjectQuery` removed; `PROJECT_MANAGE_PERMISSION` export dropped. Left one dead cache tag, now tracked as SPEC-104 |
| STD-008 | Standard | low | the card/table/empty-state rule set is repeated a third time | deferred | — | Drafted as proposed issue 2. **Wording corrected (STD-013):** the copies are near-identical with per-page overrides, not byte-identical — `.table` min-width 48/44/42rem and `.emptyState` min-height 10/12rem differ per page |
| STD-009 | Standard | low | `project.manage` hardcoded outside the Admin permission registry | deferred | — | Changes platform-wide navigation permission resolution. Drafted as proposed issue 3 |
| STD-010 | Standard | medium | same defect as SPEC-005, reported independently | resolved | `5ad2602`, `e9a9128` | Duplicate of SPEC-005 |
| SPEC-003N | Spec | low | Pre-canonicalized rows are not migrated | dismissed with evidence | — | ADR 0005 records that the application has no deployed data to preserve and that schema changes use a new schema and seed rather than backfilling. Nothing to migrate |
| STD-005N | Standard | low | The copied `databaseUuidSchema` export is unused and knip flags it | absorbed | — | Belongs to deferred STD-005 (proposed issue 1), which relocates or deletes that schema |
| PROC-001 | Process | low | The ledger file was not git-tracked | resolved | `eb35dc6` | `.forge/tasks/` is committed, matching the repository's convention for other `.forge/` metadata |

### Round 3

| ID | Type | Severity | Finding | Status | Resolving commit(s) | Resolution evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SPEC-101 | Spec | low | `PROJECT_UPDATED` audit `before`/`after` omit the repository fields, so a repository-only change records `before === after` | open | `_pending (round-3 correction dispatched)_` | `githubUrl`/`githubOwner`/`githubRepo` added to both projections (`environmentMetadata` still excluded, as it can carry secrets); HTTP test asserts a repository-only PATCH produces differing before/after |
| SPEC-102 | Spec | low | the Project list is the only collection endpoint with no pagination metadata | accepted scope | — | The issue's HTTP contract specifies "lists **all** Project records in the Organization", so an unpaginated list is the specified behaviour, not an omission. Recorded as an explicit scope decision rather than a silent one. If pagination is wanted, it is a contract change and belongs in a separate issue |
| SPEC-103 | Spec | low | repeated archive/restore is a no-op only sequentially; concurrent duplicates can each audit | open | `_pending (round-3 correction dispatched)_` | The status transition is now applied conditionally at write time and only the request that actually transitioned writes the audit event; regression test asserts the losing concurrent request returns the current project with no second audit row |
| SPEC-104 | Spec | low | Project mutations invalidate a project-scoped cache tag that no endpoint provides | open | `_pending (round-3 correction dispatched)_` | The three dead `{ type: 'Projects', id: projectId }` invalidations were removed, completing the STD-007 cleanup |
| STD-011 | Standard | low | a bare pasted identifier-shaped secret is stored verbatim as an environment KEY, and the UI copy over-promises | open | `_pending (round-3 correction dispatched)_` | Forge reproduced it by executing the real module: `ghp_…`, `github_pat_…`, `sk_live_…`, `AKIA…` and `npm_…` were each stored as a key name. Now rejected on both the Admin form and the API key schema, and the Thai copy no longer claims an absolute guarantee. Residual: a bare high-entropy token of an unrecognised shape is still indistinguishable from a legitimate variable name and is documented as such |
| STD-012 | Standard | low | (a) this ledger overstated API lint cleanliness; (b) Biome's `useImportType` "safe fix" would break NestJS constructor DI | (a) resolved (b) deferred | — | (a) corrected in this file: Biome reports 13 warnings under `modules/projects`, all `style/useImportType`, and they are known false positives — the "0 in `projects/**`" claim was wrong. (b) pre-existing across the whole API package and a repo-wide tooling change; drafted as proposed issue 6 |
| STD-013 | Standard | low | the deferred-CSS evidence claimed "byte-identical" copies that are only near-identical | resolved | — | Corrected in this ledger's STD-008 row and in proposed issue 2, with the concrete divergences (`.table` min-width 48/44/42rem; `.emptyState` min-height 10/12rem) and a requirement to parameterise them so the extraction cannot regress layout |
| STD-014 | Standard | low | the archive and restore routes have no HTTP-level test | open | `_pending (round-3 correction dispatched)_` | `projects.http.spec.ts` now covers archive and restore at the HTTP seam: 200 with the archived project, the no-op returning 200 with no extra audit row, 403 without `project.manage`, and a bodyless POST |
| PROC-002 | Process | low | this ledger pinned the reviewed commit as `233826e` and called it identical to HEAD | resolved | — | Corrected in the tracking note above; the accurate statement is that HEAD differs from the CI-verified `233826e` only in `.forge/tasks/` documentation |
| PROC-003 | Process | low | the committed follow-ups file lagged the working tree | open | `_pending (round-3 correction dispatched)_` | `.forge/tasks/issue-3-follow-ups.md` is committed with the two new operational follow-ups (proposed issues 4 and 5) and the tooling one (proposed issue 6) |

---

## Accepted residuals (final)

| Residual | Why accepted |
| --- | --- |
| A bare, unrecognised high-entropy string pasted without `=` may still be stored as a key name | No validation rule can distinguish a legitimate variable name from a token of the same shape. Known credential prefixes are now rejected and the UI copy was corrected to stop claiming an absolute guarantee; the remaining case is a documented limitation rather than an unqualified promise |
| Unused type exports flagged by `knip`: `GetProjectInput`, `databaseUuidSchema` (STD-005N), `ProjectStatus`, `ProjectsViewState` | `knip` is not one of the ten CI gates and reports 12 unused exported types across the admin, 10 of which pre-date this branch. `databaseUuidSchema` belongs to deferred STD-005 |
| API lint reports 13 `style/useImportType` warnings under `modules/projects` (60 repo-wide) | Known false positives: the API sets `emitDecoratorMetadata` and those imports must stay value imports for Nest DI. The rule cannot be made decorator-aware in Biome 2.5.12; disabling it for the API is drafted as proposed issue 6 |
| Constraint translation matches `UniqueConstraintViolationException` by type, not constraint name | The `projects` table carries exactly one unique constraint, `(organization_id, github_url)`; the only other unique key is the client-generated primary key |
| The adapter spec stubs `EntityManager` and hand-builds the violation | Proves the translation logic, not a driver error through a live transaction; the repository has no database-backed test infrastructure. A round-3 reviewer strengthened this by reading the ORM source and confirming `flush` routes through the transaction's fork, but did not replace it with execution |
| `projects.http.spec.ts` asserts the 409 message via the imported production constant | Drift-proof rather than drift-detecting; it was the explicit single-source instruction |
| `projects.http.spec.ts` has no 400/invalid-input case; AC-10 `updatedAt` DESC ordering asserted nowhere; no HTTP-level cross-organization case | Not required by any finding or acceptance criterion; all three are implementation-evidenced, and the ordering and cross-org paths are covered at use-case level |
| API response schema accepts any environment-metadata value while the client requires `configured` | The write-side masking is unconditional in both use cases, so a real response always satisfies the strict client schema |
| `organization.service.ts` and `profile.controller.ts` still import `@mikro-orm/core` in the application layer | Pre-existing User Story 29 breaches, outside this issue's scope |
| `apps/admin/next-env.d.ts` churns when the last Next command was `build` rather than `dev` | Pre-existing and tracked; folded into proposed issue 5 |

---

## Required checks — final run by Forge

| Check | Result |
| --- | --- |
| `pnpm --filter @project-forge/api test` | pass — 43 files / 158 tests |
| `pnpm --filter @project-forge/api check-types` | pass |
| `pnpm --filter @project-forge/api lint` | pass (warnings only, exit 0) — 60 warnings repo-wide, **13 of them under `modules/projects`**, all `style/useImportType` false positives. See STD-012 |
| `pnpm --filter @project-forge/api build` | pass |
| `pnpm --filter @project-forge/admin test` | pass — 32 files / 112 tests |
| `pnpm --filter @project-forge/admin typecheck` | pass |
| `pnpm --filter @project-forge/admin lint` | pass |
| `pnpm --filter @project-forge/admin check:admin-client-boundary` | pass |
| `pnpm --filter @project-forge/admin check:ui-i18n` | pass — Thai-only, no `en.json` |
| `pnpm --filter @project-forge/admin build` | pass — route `ƒ /[organizationSlug]/projects` emitted |

Baseline parity note: root `biome lint apps` and `biome format apps` report the same failure set on
`main` and on this branch (a `core.autocrlf` checkout artefact for format, and pre-existing admin
style deviations for lint), so they are not a regression. CI uses the per-package commands, which pass.

Test growth across the whole task: API 37 files / 88 tests → 43 files / 158 tests.
Admin 31 files / 88 tests → 32 files / 112 tests.

---

## CI verification (GitHub Actions, real run)

- Pull Request: **#13** (draft) — https://github.com/iwindd/project-forge/pull/13
- Workflow run: https://github.com/iwindd/project-forge/actions/runs/34524319176
- CI-verified commit: `233826e55b57f8c3c6f280ad041d1d33b48eeea1`
- Result: **success** — job "Verify pull request" passed in 2m36s

Every step passed: Checkout, Setup pnpm, Setup Node.js, Install dependencies, Prepare CI
environment, API lint, API test, API typecheck, API build, Admin lint, Admin test, Admin typecheck,
Admin client-boundary check, Admin UI i18n check, Admin build.

A second run on `aa0823a` (the ledger commit) also succeeded in 2m5s. The commits after `233826e`
change only `.forge/tasks/` documentation, so the CI-verified code is the same code this ledger
describes.

---

## Browser verification (first end-to-end run against a real database)

Run by Forge at `aa0823a` through a real browser against the locally running API and admin app,
after applying the pending migrations.

| Flow | Result |
| --- | --- |
| List + empty state | rendered — "ยังไม่มีโปรเจกต์ใน Organization นี้" |
| Create | succeeded; row appeared with the Thai success notification |
| Edit prefill | correct; `environmentMetadata` shows only the key `DATABASE_URL` and no value |
| Archive | confirmation dialog shown, then status → เก็บถาวร |
| Archived row actions | only กู้คืน offered; no edit action |
| Restore | status → ใช้งาน with success feedback |
| Error state | with the API blocked via CDP: "ไม่สามารถโหลดรายการโปรเจกต์ได้" plus a working "ลองใหม่" retry |
| Audit trail | three rows (PROJECT_CREATED, PROJECT_ARCHIVED before ACTIVE/after ARCHIVED, PROJECT_RESTORED before ARCHIVED/after ACTIVE), each with actor, organization, target and a distinct request ID |
| Masking | `environment_metadata` stored as `{"DATABASE_URL":"configured"}` — no secret value |

---

## Forge readiness decision

**Provisional — round-3 corrections are dispatched and not yet committed.** The five open rows above
(SPEC-101, SPEC-103, SPEC-104, STD-011, STD-014) plus PROC-003 are being corrected now; this section
will be re-stated with the real resolving SHAs once they land. Recorded here so the in-flight state
is explicit rather than implied.

- **Spec:** rounds 1–2 findings all resolved. Round 3 added four low findings: three accepted for
  correction (SPEC-101, SPEC-103, SPEC-104) and one recorded as an explicit scope decision (SPEC-102).
- **Standard:** rounds 1–2 findings all resolved or deferred. Round 3 added four low findings:
  STD-011 and STD-014 accepted for correction; STD-012(a) corrected in this file and STD-012(b)
  deferred as proposed issue 6; STD-013 corrected in this file and in proposed issue 2.
- **Follow-up:** no regressions across all three rounds; every prior finding preserved in its
  recorded status.
- **CI:** green on `233826e`; the commits since are documentation-only.
- **Deferred:** proposed issues 1–6 in `.forge/tasks/issue-3-follow-ups.md` (STD-005, STD-008,
  STD-009, the migration-drift diagnostics gap, the tracked-generated-artifact drift, and the
  Biome DI hazard).

The final readiness decision is issued once the round-3 corrections are committed and the gates are
re-run. The user performs the final review and merge decision; Forge never merges.

### What the next review round must do

This is the single tracked comment. A future round must **update this comment in place**, not add a
new one: increment the review number, timestamp it, record the latest reviewed HEAD SHA **and state
how it differs from the CI-verified commit**, append new rows without deleting old ones, and
re-state the readiness decision.
