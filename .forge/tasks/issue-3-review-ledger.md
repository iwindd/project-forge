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
> Branch `issue/3-organization-scoped-project-lifecycle` is pushed and open as draft Pull Request
> **#13** (https://github.com/iwindd/project-forge/pull/13). This file is mirrored as the
> `forge-review-ledger` comment on that Pull Request.
>
> **Correction (PROC-002):** earlier revisions described the CI-verified commit as "identical to the
> local branch HEAD". That was true when written and became stale. The accurate statement is that
> CI is verified green on `233826e`, and later commits change **only** `.forge/tasks/` documentation
> plus the round-3 corrections listed below; nothing under `apps/` is shared with `233826e` other
> than the code those commits themselves changed.

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
| Follow-up | **No regressions.** All 17 prior findings preserved in their recorded status; the two commits since round 2 (`eb35dc6`, `aa0823a`) are documentation-only. **3 new findings**: STD-011 (duplicate), PROC-002 (stale reviewed-SHA claim), PROC-003 (the committed follow-ups file lagged the working tree) |

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
| STD-001 | Standard | medium | Admin env field stores a pasted `KEY=value` line — including the secret — as the key name | resolved | `2a48ce3` | `variableNameOf` splits at the first `=`; names filtered by `^[A-Za-z_][A-Za-z0-9_]*$`; API schema constrains keys identically; Thai copy forbids pasting values. Its unclosed remainder became STD-011 |
| STD-002 | Standard | low | client schema does not enforce masked values | resolved | `061b274` | `z.record(z.string(), z.literal('configured'))`; positive, negative and non-string cases that discriminate |
| STD-003 | Standard | low | archive "real prior status" test cannot fail | resolved | `f443fef` | falsifiable-by-construction test deleted; the guarantee is covered discriminatingly on the restore path |
| STD-004 | Standard | low | failure paths and screen state logic unverified | resolved | `034247e` | view-state and failure mapping extracted and tested; fetch stub status-parameterisable with 403/404/409; restore spec uses a real `ForbiddenError` |
| STD-005 | Standard | low | Admin PostgreSQL-UUID schema duplicated from the organization feature | deferred | — | Fix needs a shared Admin module and touches the organization feature. Drafted as proposed issue 1 |
| STD-006 | Standard | low | concurrent duplicate returns 500 instead of 409 | resolved | `6c8dc2d` (supersedes `aa4e105`) | First attempt caught around `save`, which cannot fire because `save` never flushed. Corrected fix flushes inside the adapter and translates `UniqueConstraintViolationException` at the real failure point; port documents the flush-and-throw contract; no `@mikro-orm/*` remains in `application/**` or `domain/**` |
| STD-007 | Standard | low | dead client surface and unused exports | resolved | `c88a528` | `getProject` endpoint and `useGetProjectQuery` removed; `PROJECT_MANAGE_PERMISSION` export dropped. Left one dead cache tag, resolved as SPEC-104 |
| STD-008 | Standard | low | the card/table/empty-state rule set is repeated a third time | deferred | — | Drafted as proposed issue 2. **Wording corrected (STD-013):** the copies are near-identical with per-page overrides, not byte-identical — `.table` min-width 48/44/42rem and `.emptyState` min-height 10/12rem differ per page |
| STD-009 | Standard | low | `project.manage` hardcoded outside the Admin permission registry | deferred | — | Changes platform-wide navigation permission resolution. Drafted as proposed issue 3 |
| STD-010 | Standard | medium | same defect as SPEC-005, reported independently | resolved | `5ad2602`, `e9a9128` | Duplicate of SPEC-005 |
| SPEC-003N | Spec | low | Pre-canonicalized rows are not migrated | dismissed with evidence | — | ADR 0005 records that the application has no deployed data to preserve and that schema changes use a new schema and seed rather than backfilling. Nothing to migrate |
| STD-005N | Standard | low | The copied `databaseUuidSchema` export is unused and knip flags it | absorbed | — | Belongs to deferred STD-005 (proposed issue 1), which relocates or deletes that schema |
| PROC-001 | Process | low | The ledger file was not git-tracked | resolved | `eb35dc6` | `.forge/tasks/` is committed, matching the repository's convention for other `.forge/` metadata |

### Round 3

| ID | Type | Severity | Finding | Status | Resolving commit(s) | Resolution evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SPEC-101 | Spec | low | `PROJECT_UPDATED` audit `before`/`after` omit the repository fields, so a repository-only change records `before === after` | resolved | `89c164a` | `githubUrl`/`githubOwner`/`githubRepo` added to both projections (`environmentMetadata` still excluded, as it can carry secrets); HTTP test asserts a repository-only PATCH produces differing before/after |
| SPEC-102 | Spec | low | the Project list is the only collection endpoint with no pagination metadata | accepted scope | — | The issue's HTTP contract specifies "lists **all** Project records in the Organization", so an unpaginated list is the specified behaviour, not an omission. Recorded as an explicit scope decision rather than a silent one. If pagination is wanted, it is a contract change and belongs in a separate issue |
| SPEC-103 | Spec | low | repeated archive/restore is a no-op only sequentially; concurrent duplicates can each audit | resolved | `6e015bc` | The port gained `transitionStatus` and the adapter implements it as a conditional write (`nativeUpdate` with a status predicate, using the affected-row count), so exactly one request performs the transition and only that request writes the audit event. Archive and restore no longer read-then-write. Specs updated to assert observed behaviour plus a deterministic concurrent regression (two parallel executions → exactly one audit row) and three adapter-level cases. Forge re-verified against the real database: three archives produced **one** audit event, two restores produced **one** |
| SPEC-104 | Spec | low | Project mutations invalidate a project-scoped cache tag that no endpoint provides | resolved | `8621c27` | The three dead `{ type: 'Projects', id: projectId }` invalidations were removed, completing the STD-007 cleanup |
| STD-011 | Standard | low | a bare pasted identifier-shaped secret is stored verbatim as an environment KEY, and the UI copy over-promises | resolved | `022bda1`, `109e7b8` | Forge reproduced the defect by executing the real module: `ghp_…`, `github_pat_…`, `sk_live_…`, `AKIA…` and `npm_…` were each stored as a key name. `022bda1` rejected credential-shaped names on both the Admin form and the API key schema and corrected the Thai copy. Forge's verification of that first fix found it also silently DROPPED legitimate names (`npm_package_lock_version`), so `109e7b8` refined the rule to require a token-shaped suffix (contains a digit AND (an uppercase letter OR ≥16 characters)). Forge re-verified independently: all 6 credential tokens rejected, all 8 legitimate names kept |
| STD-012 | Standard | low | (a) this ledger overstated API lint cleanliness; (b) Biome's `useImportType` "safe fix" would break NestJS constructor DI | (a) resolved (b) deferred | — | (a) corrected in this file: Biome reports 13 warnings under `modules/projects`, all `style/useImportType`, and they are known false positives — the "0 in `projects/**`" claim was wrong. (b) pre-existing across the whole API package and a repo-wide tooling change; drafted as proposed issue 6 |
| STD-013 | Standard | low | the deferred-CSS evidence claimed "byte-identical" copies that are only near-identical | resolved | — | Corrected in this ledger's STD-008 row and in proposed issue 2, with the concrete divergences and a requirement to parameterise them so the extraction cannot regress layout |
| STD-014 | Standard | low | the archive and restore routes have no HTTP-level test | resolved | `c2993c3` | `projects.http.spec.ts` now covers archive and restore at the HTTP seam: 200 with the archived project, the no-op returning 200 with no extra audit row, 403 without `project.manage`, and a bodyless POST. This commit also added `@HttpCode(HttpStatus.OK)` to both routes — see the contract note below |
| PROC-002 | Process | low | this ledger pinned the reviewed commit as `233826e` and called it identical to HEAD | resolved | — | Corrected in the tracking note above |
| PROC-003 | Process | low | the committed follow-ups file lagged the working tree | resolved | `26591a3` | `.forge/tasks/issue-3-follow-ups.md` is committed with the two operational follow-ups (proposed issues 4 and 5) and the tooling one (proposed issue 6) |

---

## Contract note — archive and restore now answer 200, not 201

Round-3 correction `c2993c3` added `@HttpCode(HttpStatus.OK)` to `POST :id/archive` and
`POST :id/restore`. Before that they returned Nest's POST default **201**. Both round-3 reviews
specified 200 for these action endpoints and the issue describes them as returning the standard
success envelope, so this is a deliberate, observable contract change: **callers that asserted 201
must accept 200.** The Admin client treats any 2xx as success, so nothing in this repository
depends on the old code, and `POST /projects` (create) still returns 201. Flagged here because it
is the only place a round-3 correction changed externally visible behaviour.

---

## Accepted residuals (final)

| Residual | Why accepted |
| --- | --- |
| A bare, unrecognised high-entropy string pasted without `=` may still be stored as a key name, and a long legitimate name beginning with a credential prefix and carrying a digit (for example `npm_cache_v2_key_abcdef123456`) is still rejected | No rule can perfectly separate a variable name from a same-shaped token. Known credential shapes are rejected and the UI copy was corrected to stop claiming an absolute guarantee; the remaining behaviour is a documented limitation on both sides |
| Archive/restore audit `before`/`after` use literal `ACTIVE`/`ARCHIVED` values rather than deriving from the transition input | Functionally correct: the audit only runs when `applied === true`, which the conditional write guarantees means the row really was in the expected state. Deriving from the transition input would remove a theoretical drift risk; noted, not changed |
| The `transitionStatus` test fake is near-duplicated across three specs, and the archive/restore use cases are mirror images | Test-helper duplication and a deliberately symmetric pair; the contract requires separate use cases, routes, providers and audit actions |
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

## Required checks — final run by Forge at `109e7b8`

| Check | Result |
| --- | --- |
| `pnpm --filter @project-forge/api test` | pass — 43 files / 188 tests |
| `pnpm --filter @project-forge/api check-types` | pass |
| `pnpm --filter @project-forge/api lint` | pass (warnings only, exit 0) — 60 repo-wide, 13 under `modules/projects`, all `style/useImportType` false positives. See STD-012 |
| `pnpm --filter @project-forge/api build` | pass |
| `pnpm --filter @project-forge/admin test` | pass — 32 files / 133 tests |
| `pnpm --filter @project-forge/admin typecheck` | pass |
| `pnpm --filter @project-forge/admin lint` | pass |
| `pnpm --filter @project-forge/admin check:admin-client-boundary` | pass |
| `pnpm --filter @project-forge/admin check:ui-i18n` | pass — Thai-only, no `en.json` |
| `pnpm --filter @project-forge/admin build` | pass — route `ƒ /[organizationSlug]/projects` emitted |

Baseline parity note: root `biome lint apps` and `biome format apps` report the same failure set on
`main` and on this branch (a `core.autocrlf` checkout artefact for format, and pre-existing admin
style deviations for lint), so they are not a regression. CI uses the per-package commands, which pass.

Test growth across the whole task: API 37 files / 88 tests → 43 files / 188 tests.
Admin 31 files / 88 tests → 32 files / 133 tests.

---

## CI verification (GitHub Actions, real run)

- Pull Request: **#13** (draft) — https://github.com/iwindd/project-forge/pull/13
- Workflow run: https://github.com/iwindd/project-forge/actions/runs/34524319176
- CI-verified commit: `233826e55b57f8c3c6f280ad041d1d33b48eeea1`
- Result: **success** — job "Verify pull request" passed in 2m36s

Every step passed: Checkout, Setup pnpm, Setup Node.js, Install dependencies, Prepare CI
environment, API lint, API test, API typecheck, API build, Admin lint, Admin test, Admin typecheck,
Admin client-boundary check, Admin UI i18n check, Admin build. A second run on `aa0823a` also
succeeded (2m5s).

**Round-3 corrections verified in CI:** workflow run
https://github.com/iwindd/project-forge/actions/runs/34530633903 succeeded on
`a55c00e511cdc4fb52c62c340032f52e7984f878` in 1m55s with every step green — so the atomic
`transitionStatus` change, the audit-field addition, the credential-name guard, the cache-tag
cleanup and the archive/restore HTTP-status change all pass the real pipeline, not just the local
equivalents.

Invariant that stops this record going stale: commits after `a55c00e` touch only `.forge/tasks/`
documentation, so they inherit exactly this code state. Confirm with
`git diff --name-only a55c00e <HEAD> -- . ':!.forge/tasks'`, which must return nothing.

---

## Browser verification (real browser, real database)

Run by Forge through a real browser against the locally running API and admin app, after applying
the pending migrations.

### First pass (at `aa0823a`)

| Flow | Result |
| --- | --- |
| List + empty state | rendered — "ยังไม่มีโปรเจกต์ใน Organization นี้" |
| Create | succeeded; row appeared with the Thai success notification |
| Edit prefill | correct; `environmentMetadata` shows only the key `DATABASE_URL` and no value |
| Archive | confirmation dialog shown, then status → เก็บถาวร |
| Archived row actions | only กู้คืน offered; no edit action |
| Restore | status → ใช้งาน with success feedback |
| Error state | with the API blocked via CDP: "ไม่สามารถโหลดรายการโปรเจกต์ได้" plus a working "ลองใหม่" retry |
| Audit trail | three rows with actor, organization, target, distinct request IDs |
| Masking | `environment_metadata` stored as `{"DATABASE_URL":"configured"}` — no secret value |

### Second pass (at `109e7b8`, after the round-3 corrections)

| Flow | Result |
| --- | --- |
| List | renders; corrected Thai copy live ("บรรทัดที่ไม่มีเครื่องหมาย = จะถือว่าเป็นชื่อตัวแปร และระบบจะปฏิเสธชื่อที่ดูเหมือนโทเคนหรือคีย์ลับ") |
| Archive via UI | menu → confirmation dialog → status เก็บถาวร → success toast |
| Archived row | offers only กู้คืน |
| Restore via UI | status ใช้งาน → success toast |
| Repeated-action idempotency (API, real DB) | 3 × archive → **1** audit event; 2 × restore → **1** audit event |
| Audit integrity | 9/9 unique request IDs; no secret value in any before/after payload |
| Final state | project ACTIVE, `archivedAt` null, `environment_metadata` `{"DATABASE_URL":"configured"}` |

One automation note worth keeping: the Mantine row menu did not render while the browser tab was
backgrounded (`document.visibilityState === 'hidden'`), because the portal transition never mounted.
It is a harness artefact, not an application defect — `Page.bringToFront` resolved it. Recorded so a
future run does not misdiagnose it as a broken menu.

---

## Forge readiness decision

All Spec and Standard findings from three rounds are resolved, deferred with a recorded rationale, or
explicitly accepted as scope. The follow-up worker reports no regressions. All ten required checks
pass locally at `109e7b8`, and Forge independently re-verified the round-3 corrections rather than
accepting the implementing agent's report.

- **Spec:** no open findings. All nine acceptance criteria plus the contract's `updatedAt` ordering clause PASS.
- **Standard:** no open findings. STD-012(b) and the three round-1 deferrals are drafted follow-ups.
- **Follow-up:** no regressions; every prior finding preserved in its recorded status.
- **CI:** green on `233826e`; the round-3 correction commits still need a CI run (see above).
- **Deferred:** proposed issues 1–6 in `.forge/tasks/issue-3-follow-ups.md`.

**Decision: the change set is complete and review-clean, and is ready for the user's final review as
draft Pull Request #13.** Before merge the remaining steps are: push the round-3 corrections, confirm
GitHub CI is green on the new HEAD, decide on the deferred items, and mark the draft ready. The user
performs the final review and merge decision; Forge never merges.

### What the next review round must do

This is the single tracked comment. A future round must **update this comment in place**, not add a
new one: increment the review number, timestamp it, record the latest reviewed HEAD SHA **and state
how it differs from the CI-verified commit**, append new rows without deleting old ones, and
re-state the readiness decision.
