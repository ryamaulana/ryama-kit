---
name: playwright-review
description: "Playwright conventions for the qa agent (acceptance tests from PRD criteria) and for UI screenshot checks: stable locators, web-first assertions, test data, auth state, evidence. Used by qa and referenced by ui-designer/ui-critic for screenshot widths."
---

# Playwright: acceptance tests and screenshots

## Screenshots
- Widths 375x812 (mobile) and 1440x900 (desktop), into `docs/screenshots/<route>-<width>.png`. Only pages that changed.
- Open and look at every screenshot; never judge from code alone. Check the console for errors.
- Critique is done by `ui-critic`, not the author; max 2 rounds, then report what is left.

## Acceptance tests (qa)
- One test per PRD criterion in `tests/e2e/`, title starting with the criterion ID (e.g. `AC-03 ...`). Tests are independent: any test can run alone and in any order.
- Server: `playwright.config` uses `webServer` with the dev command from ARCHITECTURE.md "Run locally"; `baseURL` from it. Never hardcode ports in tests.
- Locators, in this order: `getByRole` (with name), `getByLabel`, `getByText`, `getByTestId` (only when the UI has no accessible name; ask `fe` to add `data-testid`, do not add it yourself). Never CSS classes or nth-child; styles belong to ui-designer and change.
- Assertions: web-first only (`await expect(locator).toBeVisible()`, `toHaveText`, `toHaveURL`). Never `waitForTimeout` or sleeps. Expected values come from the criterion text, not from reading the code.
- Data: each test creates what it needs through the UI or a seed/API helper, or relies on the seed script; never on data left by another test. Reset the test DB before the run.
- Auth: log in once in a setup project and reuse `storageState`; test the login flow itself only in the criteria that are about login.
- States: cover the criterion's failure path too (validation error, empty state, no permission) when the criterion names it.
- Do not assert on colors, fonts, or pixel layout; that is ui-critic's job.
- Config: `retries: 0` locally, `trace: 'retain-on-failure'`, screenshots on failure.

## Evidence (for backlog `done --evidence`)
- Report table: criterion ID | pass/fail | evidence (test title + path to trace/screenshot).
- For each failure: the exact assertion and error line, unshortened, and your call: bug (for `fe`/`be`) or ambiguous criterion (for `prd`).
- A flaky test (passes on rerun) is reported as a failure with "flaky", not as a pass.
