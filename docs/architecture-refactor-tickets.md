# Project Forge architecture refactor ticket index

Status: approved and published. GitHub Issues are the canonical tracker records; the individual files under `.scratch/project-forge-architecture-refactor/issues/` remain local mirrors. Always verify live issue state before selecting work.

## Dependency graph

```text
01 GitHub session and organization context
├── 02 Organization membership, roles, and invitations
│   ├── 03 Organization-scoped project lifecycle
│   └── 05 Transactional business audit and security audit
├── 04 Profile and GitHub connection surface
│   └── 05 Transactional business audit and security audit
├── 05 Transactional business audit and security audit
│   └── 06 Migrate remaining admin features and standardize UI states
03 ───────────────────────────────────────────────────────────────┘
06 ── 07 Legacy schema, route, docs, and script cleanup
07 ── 08 Full validation and browser acceptance
```

## Published GitHub tickets

1. [#1: GitHub session and organization context](https://github.com/iwindd/project-forge/issues/1)
2. [#2: Organization membership, roles, and invitations](https://github.com/iwindd/project-forge/issues/2)
3. [#3: Organization-scoped project lifecycle](https://github.com/iwindd/project-forge/issues/3)
4. [#4: Profile and GitHub connection surface](https://github.com/iwindd/project-forge/issues/4)
5. [#5: Transactional business audit and security audit](https://github.com/iwindd/project-forge/issues/5)
6. [#6: Migrate remaining admin features and standardize UI states](https://github.com/iwindd/project-forge/issues/6)
7. [#7: Legacy schema, route, docs, and script cleanup](https://github.com/iwindd/project-forge/issues/7)
8. [#8: Full validation and browser acceptance](https://github.com/iwindd/project-forge/issues/8)

At the time of this checkout, Issues #1–#6 and #11 are closed, #7 is the legacy-cleanup frontier, and #8 is the remaining full-validation ticket. Issues #10 and #15 are separate maintenance tickets. Native GitHub blocking dependencies are configured; live GitHub state takes precedence over this snapshot.
