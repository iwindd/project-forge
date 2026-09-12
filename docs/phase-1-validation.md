# Phase 1 validation runbook

This runbook is the repeatable validation boundary for the current `apps/api` and `apps/admin`
checkout. It keeps static checks, controlled live HTTP/browser checks, and database operations
separate so a green application check is not mistaken for a database verification or production
acceptance result.

## Static checks

Run the package-defined commands from the repository root:

```sh
pnpm --filter @project-forge/api lint
pnpm --filter @project-forge/api test
pnpm --filter @project-forge/api check-types
pnpm --filter @project-forge/api build
pnpm --filter @project-forge/admin lint
pnpm --filter @project-forge/admin test
pnpm --filter @project-forge/admin typecheck
pnpm --filter @project-forge/admin check:admin-client-boundary
pnpm --filter @project-forge/admin check:ui-i18n
pnpm --filter @project-forge/admin build
git diff --check
```

The pull-request workflow runs the same API and Admin gates, installs Chromium, and runs the
browser acceptance suite. Any pre-existing lint or formatting warning must remain visible in the
command output and must be reported separately from failures introduced by the change.

## HTTP contract coverage

Contract tests exercise the Nest HTTP boundary and assert the public response shape, request ID,
and status semantics without coupling the test to ORM internals:

| Contract | Primary coverage |
| --- | --- |
| Success envelopes | `auth.http.spec.ts`, `projects.http.spec.ts`, organization controller tests |
| Presentation validation (`422`) | `public-error.filter.spec.ts`, `projects.http.spec.ts` |
| Unauthenticated (`401`) | `auth.http.spec.ts`, `projects.http.spec.ts` |
| Forbidden (`403`) | `projects.http.spec.ts` and authorization tests |
| Not found (`404`) | `projects.http.spec.ts` and audit controller tests |
| Conflict (`409`) | `projects.http.spec.ts` and invitation lifecycle tests |

Zod failures at the presentation boundary are returned as `INVALID_INPUT` with HTTP `422` and the
structured validation issues. Domain-level invalid operations remain typed application errors.

## Controlled live API and browser checks

`apps/admin/e2e/` starts a real standalone Next.js server and a separate controlled HTTP API
fixture. The suite covers:

- GitHub login link and same-origin return path.
- Organization route navigation and organization switching.
- Organization member loading, retry/error states, audit empty state, and profile feedback.
- Project list, create, archive, restore, retry state, explicit organization scope, and the
  absence of clone, sandbox, Hermes, AI, Issue, or Pull Request requests.
- Invitation denial without an invitation, invalid or mismatched verified email, expiry,
  cancellation, resend token/expiry rotation, acceptance, and single-use rejection.

Run it locally with:

```sh
pnpm --filter @project-forge/admin test:browser
```

These are controlled live boundary checks, not production-data verification. Record them as
browser/API fixture results and do not describe them as a successful production OAuth or database
run.

## Database safety

This validation ticket does not run migrations, seeds, schema recreation, reset, backfill, or
`pnpm db:verify`. Run those commands only after the schema/seed operation has explicit approval and
the target database has been inspected. A skipped database check must be reported as skipped, not
as passed.

## Reporting format

When closing a validation run, report these sections independently:

1. Static: each package command, pass/fail, and pre-existing warnings.
2. HTTP contracts: covered statuses and test result.
3. Controlled live API/browser: scenarios and result.
4. Database: not run, or the explicitly approved command and its evidence.
