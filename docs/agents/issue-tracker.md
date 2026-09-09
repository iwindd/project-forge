# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues in `iwindd/project-forge`. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`.
- **Read an issue**: `gh issue view <number> --comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments`.
- **Comment on an issue**: `gh issue comment <number> --body "..."`.
- **Apply/remove labels**: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- **Close**: `gh issue close <number> --comment "..."`.

Infer the repository from the configured GitHub remote when running `gh` inside this checkout.

## Pull requests as a triage surface

**PRs as a request surface: no.** Pull requests are not treated as incoming feature requests by the triage flow.

## When a skill says “publish to the issue tracker”

Create or update a GitHub issue in `iwindd/project-forge` and apply the appropriate triage label.
