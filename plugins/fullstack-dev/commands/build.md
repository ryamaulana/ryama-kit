---
description: "Build from docs/PRD.md with a scope. Usage: /fullstack-dev:build <scope> [notes]. Scopes: all | boilerplate | ui-only | fe-only | be-only | review"
argument-hint: "<all|boilerplate|ui-only|fe-only|be-only|review> [notes]"
---

Scope and notes from the user: $ARGUMENTS

Find the PRD first (skill `project-context`; it may not be at `docs/PRD.md`). If none exists, stop and tell the user to run the `prd` agent. Execute ONLY the scope below by delegating to subagents (pass them the scope and notes, not chat history; they read the docs themselves). Never run steps outside the scope.

Delegation rule: to `ui-designer`, `ux`, and `ui-critic` send only the owner's words quoted verbatim, doc paths, and the scope. Never write visual decisions (style, colors, fonts, layout, illustrations, section shapes/counts) and never tell them to skip their steps or docs (DESIGN.md, concept, screen plan, audit).

Visual work always goes to `ui-designer` (from the ui-designer-kit plugin; if it is not installed, stop and say so). Its own flow (arah/konsep -> rancangan layar -> token -> bangun sekali -> satu audit + satu batch perbaikan; jalur cepat untuk edit kecil setelah DESIGN.md Approved) stays intact. Call `ui-critic` only for new screens or layout/hierarchy changes, not for fast-path edits.

- `boilerplate`: `architect` (docs/ARCHITECTURE.md + docs/TASKS.md, minimal) -> `fe` and `be` scaffold structure only. No `ui-designer`, no styling. Stop.
- `ui-only`: needs an approved direction (`docs/DESIGN.md` with Status Approved from `/fullstack-dev:ui-direction`); if missing, stop and tell the user to run `/fullstack-dev:ui-direction` first. Then `ui-designer` builds the remaining screens with that system (tokens, `ui-craft` audit must pass) and static HTML mockups in `docs/mockups/` (no app code). `ui-critic` reviews new screen groups (not fast-path edits) before you stop. Stop and ask the user to approve before anything is built.
- `fe-only`: needs `docs/ARCHITECTURE.md` (else run `architect` first). `fe` does wiring/structure; `ui-designer` does visuals (needs approved `docs/DESIGN.md`, else run the `ui-only` scope first). Then `ui-critic` reviews screenshots of new screens or changed layouts (one fix batch), `ui-designer` applies it in one round, max 2 rounds.
- `be-only`: needs `docs/ARCHITECTURE.md` (else `architect` first). `be` implements, then `cyber` reviews.
- `review`: `qa` runs acceptance tests, `cyber` reviews the diff, `ui-critic` reviews screenshots if UI exists. Report only.
- `all`: ask for design references first if none exist (`docs/referensi/` or user link). `ux` (skip if `docs/UX.md` exists) -> `architect` (also writes `docs/KEPUTUSAN.md`) -> `ui-designer` **Stage A only** (tokens, component sheet, core screens: the screens of the main flow, no fixed count; stop and ask the owner to approve the direction; never produce every screen before approval) -> after approval `ui-designer` Stage B (remaining screens) -> `be` and `fe` -> `ui-designer` visuals -> `ui-critic` per new screen group (one fix batch per round, max 2 rounds) -> `qa` -> `cyber`.

Untuk proyek dengan banyak layar, lebih baik gunakan `/fullstack-dev:backlog` lalu `/fullstack-dev:run` (urutan berdependensi, satu agent per item). Perintah build ini untuk scope tunggal.

Finish with: which subagents were actually invoked, what was skipped, open issues, next suggested command.
