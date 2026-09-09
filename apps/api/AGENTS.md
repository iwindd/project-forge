# API Rules

## RULES

- Use `kebab-case` for all new or renamed files under `apps/api`.
- Keep one application use case per file.
- Name use case files as `<use-case-name>-use-case.ts`.
- Name the matching test file as `<use-case-name>-use-case.spec.ts`.
- Keep tests beside the use case they cover and update all imports when a use case is moved.

## Validation Rules

- Validate every external request body, query, and parameter with a local Zod schema at the API presentation boundary.
- Keep frontend and backend schemas separate, but mirror their field names, required/optional rules, trimming, bounds, enum values, and permission rules so both sides enforce the same contract.
