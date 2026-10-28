---
description: "Audit the project's PRD (found via project-context) for gaps before building: anything an implementer would have to guess."
---

Delegate to the `prd` agent in audit mode, following its `prd-review` skill: read the PRD as a skeptical engineer, list findings ranked by risk with the question the user must answer, and end with the verdict line. Do not rewrite the PRD; after the user answers, offer to update it with the `prd` skill.
