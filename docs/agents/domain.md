# Domain Docs

How engineering skills should consume this repository's domain documentation.

## Before exploring

- Read `CONTEXT.md` at the repository root.
- Read ADRs in `docs/adr/` that touch the area being changed.
- Use the glossary vocabulary from `CONTEXT.md` in issue titles, proposals, tests, and implementation notes.
- If a proposed change contradicts an ADR, surface the conflict explicitly before changing the decision.

## Layout

This is a single-context repository:

```text
/
├── CONTEXT.md
├── docs/adr/
└── apps/
```

`CONTEXT.md` is the domain glossary. `docs/adr/` contains accepted architectural decisions. Keep implementation details in the relevant specification or ticket rather than expanding the glossary.
