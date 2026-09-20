---
name: project-forge-navbar
description: "Use when changing Forge navigation; verify route and shell."
version: 0.1.0
author: iwindd, Hermes Agent
license: MIT
platforms: [windows]
metadata:
  hermes:
    tags: [project-forge, navigation, navbar, nextjs, admin-ui]
    related_skills: []
---

# Project Forge Navbar Skill

Use this skill for any Project Forge Admin route or navigation change. It keeps the
canonical route registry, organization navbar, account navigation, App Router shell,
permission filtering, localized labels, and browser verification aligned. It does not
move authorization into the browser or add a second navigation abstraction.

## When to Use

- Add, rename, hide, or move an Admin menu item.
- Add an Organization route that must appear in the shared sidebar/navbar.
- Diagnose a missing menu item, wrong active state, page-title mismatch, or hydration error.
- Diagnose an RTK Query cache-tag warning caused by a new navigation-backed feature.

Do not use for API authorization changes; keep those in `apps/api` and verify them
separately from navigation visibility.

## Prerequisites

- Read `AGENTS.md` and `apps/admin/AGENTS.md`.
- Read `CONTEXT.md` and the nearest route/page implementation.
- Confirm the target is the Organization shell or the separate Account shell.
- Inspect the running route in a real browser when the change affects hydration,
  responsive navigation, or client-side data loading.

## How to Run

From the repository root, run the smallest focused checks first:

```text
pnpm --filter @project-forge/admin test -- src/routes.test.ts src/lib/navigation.test.ts
pnpm --filter @project-forge/admin typecheck
pnpm --filter @project-forge/admin check:admin-client-boundary
pnpm --filter @project-forge/admin check:ui-i18n
```

For a route, shell, or client-data change, also run the Admin build and a browser
smoke flow. Start the shared local preview only after checking that ports are free:

```text
pnpm --filter @project-forge/admin build
pnpm dev:all
```

## Quick Reference

- `apps/admin/src/routes.ts` — canonical route metadata, paths, labels, parents, permissions.
- `apps/admin/src/lib/navigation.ts` — Organization and Account menu definitions; use `routeItem`.
- `apps/admin/src/components/navigation/navigation-utils.ts` — permission filtering, active state, href compilation.
- `apps/admin/src/components/navigation/sidebar-nav-content.tsx` — shared menu renderer.
- `apps/admin/src/components/navigation/sidebar-default.tsx` — desktop shell and Organization switcher.
- `apps/admin/src/components/navigation/sidebar-drawer.tsx` — mobile drawer using the same renderer.
- `apps/admin/src/components/admin-shell.tsx` — AppShell header/navbar, shell mode, providers.
- `apps/admin/src/components/admin-header.tsx` — title derived from the active route trail.
- `apps/admin/src/hooks/index.ts` — `useActiveRouteTrail`, permissions, notifications.
- `apps/admin/messages/th.json` — Thai `Navigation` labels and feature copy.
- `apps/admin/src/lib/api/api.ts` — browser API base query and the complete RTK Query tag list.

## Procedure

1. Classify the destination as Organization-scoped or Account-scoped. Use the
   Organization route group and `organizationNavigation` for shared app resources;
   use `accountNavigation` only for `/account/*`. Completion criterion: the target
   has exactly one shell owner.
2. Add or verify the canonical route in `routes.ts` before adding a menu item. Use
   `/:organizationSlug/...` for Organization pages and preserve the route name used
   by `getPath`, `routeItem`, and `findRouteTrail`. Completion criterion: `getPath`
   produces the intended URL and `findRouteTrail` returns the target route.
3. Add the App Router page under the matching `(web)` route directory. The layout
   supplies authentication, Organization scope, `AppProvider`, and `AdminShell`;
   the page owns its `PageHeader` and domain data UI. Completion criterion: direct
   navigation to the target route renders through the intended shell.
4. Add the menu item in `lib/navigation.ts` with `routeItem(...)`, the matching
   `labelKey`, and an icon from the existing Tabler set. Do not hard-code a dynamic
   Organization slug in the item. Completion criterion: the item href remains the
   route template and `getLinkHref` fills the current `organizationSlug`.
5. Apply permission metadata only when the menu visibility is genuinely scoped.
   `useNavigationGroups` filters browser visibility, but the API remains the
   authorization boundary. Completion criterion: a hidden menu item cannot be used
   as evidence that the API is protected.
6. Keep desktop and mobile navigation aligned. `SidebarDefault` and
   `SidebarDrawer` must continue to render `SidebarNavContent`; do not add a second
   one-off menu for mobile. Completion criterion: the item is present in both
   navigation surfaces and closes the drawer after navigation.
7. Add the locale key to every supported message file and use `labelKey` for the
   rendered label. Keep identifiers such as route names, Agent handles, and Project
   slugs unchanged. Completion criterion: the UI i18n check finds no missing key.
8. Add route and navigation regression tests. Test the canonical path/trail and the
   menu item's route, label key, and permission intent. Completion criterion: tests
   fail if the route exists without its navbar entry or the entry points elsewhere.
9. If the feature uses RTK Query, add its cache tag to the single `API_TAG_TYPES`
   list before using `providesTags` or `invalidatesTags`. Completion criterion: the
   feature test proves the tag is registered and no browser warning appears.
10. Diagnose hydration errors before changing markup. Compare the Server/Client
    values in the Next overlay and inspect the current process output. After adding
    routes, navigation groups, translations, or tag types, cold-restart the Admin
    dev process so Turbopack and RTK Query singletons cannot retain an older module
    graph. Completion criterion: the target route reloads with no page errors,
    hydration warnings, or tag-type warnings.
11. Exercise the protected route using the real same-origin URL. Verify the browser
    API request uses the public origin when the app is opened through Cloudflare;
    never use a laptop-only `localhost` API URL for iPad review. Completion criterion:
    the API returns the expected authenticated contract, and unauthenticated access
    returns the standard 401 envelope without leaking server metadata.
12. Finish with the repository checks required by `apps/admin/AGENTS.md`, then inspect
    `git diff --check` and the staged diff for secrets. Completion criterion: every
    changed file is intentional, no credential/path/token is browser-visible, and
    the working tree is clean after the requested commit.

## Pitfalls

- Adding a route without adding `routeItem` leaves the page reachable but absent from
  the navbar; adding a menu item without a route makes `getRoute` fail at module load.
- Editing only `SidebarDefault` creates desktop/mobile drift. The shared renderer is
  the navigation seam.
- `label` is a fallback; use `labelKey` for user-facing copy so server and client
  translations stay aligned.
- Browser permission filtering is not authorization. Never remove the API guard or
  rely on a hidden menu for security.
- A stale Next dev client can show a server/client route-title mismatch and a stale
  RTK Query singleton can report a missing tag type even when current source is
  correct. Restart the full preview and reload the route before changing unrelated
  UI code.
- The Admin app's `NEXT_PUBLIC_API_URL` must be same-origin when reviewed through
  the public tunnel. `localhost` on an iPad points to the iPad, not the development
  laptop.
- A Nest provider whose constructor depends on an interface/type alias must use
  `@Injectable()` plus an explicit class token such as `@Inject(HermesRuntimeService)`.
  Startup can look healthy while the use case receives `undefined` and returns a 500;
  keep an HTTP wiring test that instantiates the real provider.
- Do not expose Hermes paths, tokens, provider credentials, raw gateway errors, or
  filesystem metadata in a browser response or user-facing error.
- Stop the dev server before a production build; `.next` is a single-writer artifact.

## Verification

Report these statuses separately:

- **Route/nav contract:** route tests and navigation tests pass; menu is visible in
  the Organization desktop and mobile surfaces.
- **Runtime/browser:** authenticated target route renders after a cold restart with
  no `pageerror`, hydration mismatch, or RTK Query tag warning.
- **Resource/API health:** target API request status and response contract are valid;
  public `/api/v1/health` and `/login` are supporting smoke checks only.
- **Delivery:** changed files are reviewed, `git diff --check` passes, and the commit
  hash is read back from the active branch. Do not claim remote delivery unless the
  branch was explicitly pushed and the remote was verified.
