<!-- forge-review-ledger -->
# Review ledger — issue #3 `Organization-scoped project lifecycle`

Tracked review history for branch `issue/3-organization-scoped-project-lifecycle`.

This is the durable review record. On the Pull Request the same content is posted as a single
tracked comment, so later review rounds **update that one comment** rather than adding new ones.
The repository copy mirrors it for local and offline review.

Rows are never deleted, only appended and re-statused.

> **Tracking note (PROC-001, resolved):** this file, `.forge/tasks/issue-3.yaml` and
> `.forge/tasks/issue-3-follow-ups.md` are now committed to the branch
> (`chore(forge): add issue #3 task contract and review ledger`), matching the repository's
> existing convention of tracking other `.forge/` metadata (`scan.json`, `project.md`,
> `features.md`). They were working-tree-only during the review rounds, which is why they are
> absent from the per-finding commits.
>
> Branch `issue/3-organization-scoped-project-lifecycle` was pushed and opened as draft Pull
> Request **#13** (https://github.com/iwindd/project-forge/pull/13). This file is mirrored verbatim
> as the `forge-review-ledger` comment on that Pull Request.

---

## Review #1 — initial gate

- Timestamp: `2026-09-11T01:51:02+07:00` (dispatched) / `2026-09-11T01:56:28+07:00` (reported)
- Reviewed commit (HEAD): `04f6676f0304f219abc09e438a86a613569add9e`; base `main` @ `decb2c9`
- Workers: `review-spec` (SPEC-001..004), `review-standard` (STD-001..009), in parallel

### Spec review

| Result | Detail |
| --- | --- |
| Status | findings — 7 PASS, 2 PARTIAL, 0 FAIL |
| Summary | AC-5 PARTIAL (branch/runtime propagation and update-side masking untested → SPEC-001). AC-6 PARTIAL (no 401, no route-level 403, no archived-read, no HTTP-level spec → SPEC-002). Two low defects: owner/repo casing not canonicalized (SPEC-003); request ID minted twice (SPEC-004). |

### Standard review

| Result | Detail |
| --- | --- |
| Status | findings — no blocker, no hard rule violation |
| Summary | All ten gates green. One medium secret-handling defect reproduced by execution (STD-001) plus eight low items. Six items it checked and confirmed pre-existing on `main` were correctly not raised as new findings. |

---

## Review #2 — post-correction re-review

- Dispatched `2026-09-11T02:32:13+07:00`, reported `2026-09-11T02:42:37+07:00`
- Reviewed commit (HEAD): `c88a528`; base `main` @ `decb2c9`
- Workers: `review-spec`, `review-standard`, `review-follow-up` (three in parallel)
- Prior findings passed in: all 11 open IDs with their resolved statuses, so reviewers skipped
  unchanged resolved findings unless the code regressed

### Results

| Worker | Result |
| --- | --- |
| Spec | All four round-1 corrections verified resolved (re-ran the suites: 12 files / 72 projects+http tests). 9 of 9 acceptance criteria PASS. One new HIGH finding: SPEC-005. Secondary observations not raised as findings: the AC-10 `updatedAt` DESC ordering is implemented but asserted nowhere, and there is no HTTP-level cross-organization denial case for AC-1 |
| Standard | No regression, no new defect, no hard rule violation. All six corrected findings and all three deferrals re-verified; all four accepted residuals confirmed acceptable. One new medium finding: STD-010, identical to SPEC-005 and verified pre-existing on `main` |
| Follow-up | **No regressions.** All 11 prior findings genuinely resolved, each backed by a test that fails if the fix is removed. Three new low items: SPEC-003N, STD-005N, PROC-001 |

---

## Findings (cumulative) — final status

| ID | Type | Severity | Finding | Status | Resolving commit(s) | Resolution evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SPEC-001 | Spec | medium | AC-5: branch/runtime propagation and update-side masking untested | resolved | `38343af` | create spec asserts sourceBranch/targetBranch/nodeVersion on the saved record plus schema defaults; update spec asserts branch/nodeVersion on the record and in audit before/after and now executes the update-side masking branch |
| SPEC-002 | Spec | medium | AC-6: no 401, no route-level 403, no archived-read, no HTTP-level spec | resolved | `14a4bf5` | `projects.http.spec.ts` boots the real controller, real `SessionGuard`, real use cases and real `PublicErrorFilter`; covers 401, 403 non-member and without `project.manage`, 404 project and organization, 409 archived-update and duplicate repository, archived read |
| SPEC-003 | Spec | low | owner/repo casing not canonicalized | resolved | `eec05ab`, `afce457` | owner and name lowercased; `.git` stripped after lowercasing so `ACME/DEMO.GIT` collapses to `acme/demo`; domain + use-case tests. No backfill needed — see SPEC-003N |
| SPEC-004 | Spec | low | request ID minted twice per request | resolved | `cc03c6a` | `getRequestId` memoizes on the express `Request`; `request-context.spec.ts` covers repeated calls, inbound header, blank header, distinct requests |
| SPEC-005 | Spec | high | a partial PATCH silently overwrites every omitted field | resolved | `5ad2602`, `e9a9128` | `updateProjectSchema` rebuilt as an explicit all-optional object with NO defaults over shared no-default field shapes; schema-level discriminating test plus three HTTP regression tests (single-field PATCH, empty body, branch-only name preservation). Forge re-ran an independent probe: omitted fields now parse to `undefined`; create defaults intact. Found in round 2 |
| STD-001 | Standard | medium | Admin env field stores a pasted `KEY=value` line — including the secret — as the key name | resolved | `2a48ce3` | `variableNameOf` splits at the first `=`; names filtered by `^[A-Za-z_][A-Za-z0-9_]*$`; API schema constrains keys identically; Thai copy forbids pasting values; tests assert no secret fragment survives |
| STD-002 | Standard | low | client schema does not enforce masked values | resolved | `061b274` | `z.record(z.string(), z.literal('configured'))`; positive, negative and non-string cases that discriminate |
| STD-003 | Standard | low | archive "real prior status" test cannot fail | resolved | `f443fef` | falsifiable-by-construction test deleted; the guarantee is now covered discriminatingly on the restore path |
| STD-004 | Standard | low | failure paths and screen state logic unverified | resolved | `034247e` | view-state and failure mapping extracted and tested; fetch stub status-parameterisable with 403/404/409; restore spec uses a real `ForbiddenError` |
| STD-005 | Standard | low | Admin PostgreSQL-UUID schema duplicated from the organization feature | deferred | — | Fix needs a shared Admin module and touches the organization feature. Drafted in `issue-3-follow-ups.md` |
| STD-006 | Standard | low | concurrent duplicate returns 500 instead of 409 | resolved | `6c8dc2d` (supersedes `aa4e105`) | First attempt caught around `save`, which cannot fire because `save` never flushed. Corrected fix flushes inside the adapter and translates `UniqueConstraintViolationException` at the real failure point; port documents the flush-and-throw contract; no `@mikro-orm/*` remains in `application/**` or `domain/**` (User Story 29) |
| STD-007 | Standard | low | dead client surface and unused exports | resolved | `c88a528` | `getProject` endpoint and `useGetProjectQuery` removed; `PROJECT_MANAGE_PERMISSION` export dropped; `MASKED_ENVIRONMENT_METADATA_VALUE` keeps its export because STD-002 made it cross-module |
| STD-008 | Standard | low | third verbatim copy of the card/table CSS block | deferred | — | Extraction refactors three existing pages. Drafted in `issue-3-follow-ups.md` |
| STD-009 | Standard | low | `project.manage` hardcoded outside the Admin permission registry | deferred | — | Changes platform-wide navigation permission resolution. Drafted in `issue-3-follow-ups.md` |
| STD-010 | Standard | medium | same defect as SPEC-005, reported independently | resolved | `5ad2602`, `e9a9128` | Duplicate of SPEC-005; see that row. Found in round 2 |
| SPEC-003N | Spec | low | Pre-canonicalized rows are not migrated, so a differently-cased URL could still create a second Project | dismissed with evidence | — | ADR 0005 states the application has no deployed data to preserve and that schema changes use a new schema and seed rather than backfilling. With no deployed rows there is nothing to migrate. No migration added, deliberately and by recorded policy |
| STD-005N | Standard | low | The copied `databaseUuidSchema` export is unused and knip flags it; the residual list named only `GetProjectInput` | absorbed | — | Belongs to deferred STD-005, which relocates or deletes that schema anyway. Recorded in the residual table and in `issue-3-follow-ups.md` |
| PROC-001 | Process | low | The ledger file was not git-tracked, contrary to the round-2 brief's premise | resolved | `chore(forge): add issue #3 task contract and review ledger` | Correctly observed. `.forge/tasks/` is now committed to the branch, matching the repository's convention for other `.forge/` metadata |

---

## Accepted residuals (final)

| Residual | Why accepted |
| --- | --- |
| Unused type exports flagged by `knip`: `GetProjectInput`, `databaseUuidSchema` (STD-005N), `ProjectStatus`, `ProjectsViewState` | `knip` is not one of the ten CI gates and reports 12 unused exported types across the admin, 10 of which pre-date this branch. `databaseUuidSchema` belongs to deferred STD-005 |
| Constraint translation matches `UniqueConstraintViolationException` by type, not constraint name | The `projects` table carries exactly one unique constraint, `(organization_id, github_url)`; the only other unique key is the client-generated primary key |
| The adapter spec stubs `EntityManager` and hand-builds the violation | Proves the translation logic, not a driver error through a live transaction; the repository has no database-backed test infrastructure (`grep` for `MikroORM.init`/`testcontainers` in specs returns nothing) |
| `projects.http.spec.ts` asserts the 409 message via the imported production constant | Makes the assertion drift-proof rather than drift-detecting; it was the explicit single-source instruction |
| `projects.http.spec.ts` has no 400/invalid-input case; AC-10 `updatedAt` DESC ordering asserted nowhere; no HTTP-level cross-organization case | Not required by any finding or acceptance criterion; all three are implementation-evidenced, and the ordering and cross-org paths are covered at use-case level |
| API response schema accepts any environment-metadata value while the client requires `configured` | The write-side masking is unconditional in both use cases, so a real response always satisfies the strict client schema; tightening the response schema was outside the correction's allowed API surface |
| `organization.service.ts` and `profile.controller.ts` still import `@mikro-orm/core` in the application layer | Pre-existing User Story 29 breaches, outside this issue's scope |

---

## Required checks — final run by Forge at `e9a9128`

| Check | Result |
| --- | --- |
| `pnpm --filter @project-forge/api test` | pass — 43 files / 158 tests |
| `pnpm --filter @project-forge/api check-types` | pass |
| `pnpm --filter @project-forge/api lint` | pass — 60 pre-existing warnings, 0 in `projects/**` |
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

## Forge readiness decision

All Spec and Standard findings from both rounds are resolved, the follow-up worker confirms no
regressions, and all ten required checks pass at `e9a9128`, independently re-run by Forge.

- **Spec:** no open findings. All nine acceptance criteria PASS at review #2; SPEC-005 corrected and re-verified.
- **Standard:** no open findings. All corrected findings verified real; the three deferrals are documented and drafted.
- **Follow-up:** no regressions; all 11 prior findings confirmed genuinely resolved.
- **CI:** GitHub checks run against the pushed branch and the draft Pull Request; this ledger is the
  tracked `<!-- forge-review-ledger -->` comment on that Pull Request, so the next review round
  increments the review number here instead of adding a new comment.

**Decision: the change set is complete and ready for the user's final review as a DRAFT Pull
Request.** It is not ready to merge until GitHub CI passes and the three deferred low-severity
items are either accepted or scheduled. The user performs the final review and merge decision;
Forge never merges.
