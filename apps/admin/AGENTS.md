<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commands

- This is one npm package; use `npm ci` with the committed `package-lock.json`.
- Admin has no database or authentication implementation of its own. Configure `NEXT_PUBLIC_API_URL` to point at `apps/api`.
- `npm run dev` and `npm start` use port `5051`.
- Verification for admin work is `npm run lint`, `npm run typecheck`, `npm run check:admin-client-boundary`, `npm test -- --run`, and `npm run build` for route/configuration changes.
- `npm run lint` intentionally checks only `src/components/**/*.{ts,tsx}`, `src/app/admin/**/*.{ts,tsx}`, `src/servers/**/*.{ts,tsx}`, `src/hooks/**/*.{ts,tsx}`, and `src/lib/**/*.{ts,tsx}` for now. Public `(web)` lint is out of scope until its pre-existing errors (`no-explicit-any`, `react-hooks/set-state-in-effect`, and others) are addressed. Do not report a full-repository lint as passing based on the admin-only command.
- Database migrations and seeds belong to `apps/api`; do not add an ORM, database access, or API routes to this package.

## Admin Verification

- Every admin task must leave `npm run lint` passing.
- Run `npm run check:admin-client-boundary` to scan exported function props in admin `"use client"` entry components. Function props must be named `action` or end with `Action`.
- `npm run typecheck` remains a project-wide TypeScript check.
- Next.js client-boundary warnings about function props come from the Next TypeScript plugin, not ESLint or the `tsc --noEmit` script. In `"use client"` entry components, custom function props should use `action` or an `Action` suffix; this naming convention does not turn a function into a Server Action.

## API Boundary

- All authentication, authorization, reads, and mutations belong to the NestJS API in `apps/api`.
- The Admin app calls `/api/v1/*` and must not add `src/app/api`, Server Actions, ORM clients, or direct database access.
- Keep UI-specific queries, types, and components in the Admin app; keep domain validation and persistence in the API.

## Application Boundaries

- There is deliberately no `src/app/layout.tsx`. `src/app/(web)/layout.tsx` and `src/app/admin/layout.tsx` are separate root layouts; moving a route between them changes providers/styles and navigation across them performs a full page load.
- Status pages: `src/app/(web)/not-found.tsx` and `src/app/(web)/error.tsx` render the public 404/500 inside the public layout. Unmatched URLs and root-layout failures are handled by `src/app/global-not-found.tsx` (requires `experimental.globalNotFound`) and `src/app/global-error.tsx`; because there is no single root layout, those two files must render their own `<html>`/`<body>`, fonts and styles. All four share `src/components/StatusScreen.tsx`. `global-error.tsx` is shared with the admin app, so keep it free of public-site branding.
- The public root uses `LayoutScaler`, `SiteNav`, `SiteFoot`, the frontend Mantine provider/theme, and `src/app/(web)/globals.css`. The admin root uses its own Mantine provider/theme, Redux, and admin CSS modules; keep the frontend and admin UI systems separate.
- The live Admin application is `src/`; the NestJS API and its MikroORM schema live in `apps/api`.
- The admin app is a UI client for the NestJS API. It has no `src/app/api`, Server Actions, ORM client, or direct database access.
- Browser-served assets belong in `public/`.

## Database Safety

- Run API migrations from the workspace root with `pnpm db:migrate`; the API uses MikroORM migrations under `apps/api/src/database/migrations/`.
- Run API seed data with `pnpm --filter @project-forge/api db:seed` only when the task explicitly requires seed changes.
- Inspect the configured `DATABASE_URL` and migration target before applying schema changes. Never reset or drop the database unless the task explicitly calls for it.

## Admin And Auth

- Next.js 16 request handling lives in `src/proxy.ts` (not `middleware.ts`); authentication is backed by the API-issued `pf_session` cookie and `src/auth.ts`; `src/app/admin/(main)/layout.tsx` also enforces an authenticated session.
- `src/admin/routes.ts` owns route metadata and `src/admin/navigation.ts` derives menu items with `routeItem(...)`. Add the route first and leave it disabled until its App Router page exists.
- `src/admin/permissions.ts` only controls navigation visibility. The API remains the authorization boundary and applies platform plus Organization roles.
- GitHub OAuth starts at the API endpoint `/api/v1/auth/github/start`; preserve the API-backed login link and the session refresh behavior in the Admin shell.

## Forms And Validation

- Use `useForm` from `@mantine/form` for every Admin form.
- Define a local Zod schema for every form and connect it to Mantine with `schemaResolver` from `@mantine/form`.
- Use the form's `onSubmit`, `getInputProps`, and error state instead of hand-rolled field validation.
- Keep frontend form schemas in the Admin app; mirror the API schema's field names, required/optional rules, trimming, bounds, enum values, and permission rules without importing validation code across apps.

## Date And Time Formatting

- Use `next-intl` for all user-facing date and time formatting. Do not create or import a display-formatting utility such as `src/utils/format.ts`.
- Define shared presets in `src/lib/i18n/request.ts` under `formats.dateTime`. Keep the application-wide `timeZone` and Buddhist calendar settings in the request config so Server and Client Components use the same rules.
- In a Client Component, call `useFormatter` inside the component and use a registered preset:

  ```tsx
  import { useFormatter } from "next-intl";

  const format = useFormatter();
  const label = format.dateTime(new Date(value), "dateTime");
  ```

- In an async Server Component or Server Action, use `getFormatter` from `next-intl/server` instead of calling a React hook:

  ```tsx
  import { getFormatter } from "next-intl/server";

  const format = await getFormatter();
  const label = format.dateTime(new Date(value), "date");
  ```

- Use the existing preset names (`date`, `shortDate`, `dateTime`, and `longDate`). If a new display pattern is needed, add a named preset to `src/lib/i18n/request.ts` first and then reference that preset from consumers.
- Normalize or validate date input before passing it to the formatter. Keep invalid-value fallback behavior at the component boundary; do not recreate `Intl.DateTimeFormat` instances in individual components.
