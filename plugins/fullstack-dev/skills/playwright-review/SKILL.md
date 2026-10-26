---
name: playwright-review
description: Use when verifying a UI change or PRD acceptance criteria with Playwright - screenshot capture conventions and the limited critique loop.
---

# Verification conventions

- Screenshots: 375x812 (mobile) and 1440x900 (desktop) into `docs/screenshots/<route>-<viewport>.png`. Only pages that changed.
- Always open the screenshots and look at them; never judge from code alone. Check the console for errors.
- Critique is done by `ui-critic` (not the author). It returns max 7 ordered fixes.
- Author applies fixes and re-screenshots. Max 2 rounds in this plugin's flow, then report what is left instead of looping.
- Acceptance tests: each criterion in `docs/PRD.md` gets one Playwright test in `tests/e2e/`, named with the criterion ID. `qa` owns these.
