---
description: "Build from docs/PRD.md with a scope. Usage: /fullstack-dev:build <scope> [notes]. Scopes: all | boilerplate | ui-only | fe-only | be-only | review"
argument-hint: "<all|boilerplate|ui-only|fe-only|be-only|review> [notes]"
---

Scope and notes from the user: $ARGUMENTS

Read `docs/PRD.md` first. If it is missing, stop and tell the user to run the `prd` agent. Execute ONLY the scope below by delegating to subagents (pass them the scope and notes, not chat history; they read the docs themselves). Never run steps outside the scope.

Visual work always goes to `ui-designer` (from the ui-designer-kit plugin; if it is not installed, stop and say so). Its own flow (reference gate -> docs/DESIGN.md -> build -> Playwright check) stays intact.

- `boilerplate`: `architect` (docs/ARCHITECTURE.md + docs/TASKS.md, minimal) -> `fe` and `be` scaffold structure only. No `ui-designer`, no styling. Stop.
- `ui-only`: `ui-designer` -> reference gate, `docs/DESIGN.md`, and ALSO static HTML mockups of the key screens in `docs/mockups/` (no app code). Stop and ask the user to approve before anything is built.
- `fe-only`: needs `docs/ARCHITECTURE.md` (else run `architect` first). `fe` does wiring/structure; `ui-designer` does visuals (needs approved `docs/DESIGN.md`, else run the `ui-only` scope first). Then `ui-critic` reviews screenshots, `ui-designer` applies fixes, max 2 rounds.
- `be-only`: needs `docs/ARCHITECTURE.md` (else `architect` first). `be` implements, then `cyber` reviews.
- `review`: `qa` runs acceptance tests, `cyber` reviews the diff, `ui-critic` reviews screenshots if UI exists. Report only.
- `all`: `architect` -> `ui-designer` (mockups; stop for approval) -> `be` and `fe` -> `ui-designer` visuals -> `ui-critic` -> `qa` -> `cyber`.

Finish with: which subagents were actually invoked, what was skipped, open issues, next suggested command.
