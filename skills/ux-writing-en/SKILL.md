---
name: ux-writing-en
description: Addendum to the ux-writing skill for English UIs - second person, word limits measured by the audit, no slogans or rhyme on functional screens, no claims beyond the PRD. Wins over ux-writing when they conflict. Use only when the UI language is English. Used by ui-designer, ui-critic and ux.
---

# UX writing, English (addendum, wins over `ux-writing`)

General principles (purposeful, concise, conversational, clear; patterns for buttons, errors, empty states, confirmations) live in the `ux-writing` skill. Read that first. This file only holds what is specific to this kit. For Indonesian UIs use `ux-writing-id` instead; never mix both on one screen.

## Extra rules

1. **Plain English, second person ("you").** No exclamation hype; at most 1 exclamation mark per screen. Sentence case everywhere (capital only at the start of a sentence and for proper nouns). Prefer everyday words over jargon.
2. **Task first, brand second.** A functional screen title names the task ("Sign in"), not a slogan. No rhyme or wordplay on functional screens (sign in, sign up, pay, active exam). A slogan belongs on a landing page only, and it must still say what the product is.
3. **Do not repeat.** A sentence that loses no information when deleted is deleted.
4. **Facts only from the PRD.** Numbers, features, "automatic", "free" must trace to the PRD. Not in the PRD: write it neutrally and record a question for the user. Never invent.
5. **One term, one meaning.** Write the glossary (max 10 lines) under "Terms & tone" in `docs/DESIGN.md` before writing any text.
6. **Placeholder = an example value** ("name@email.com"), not a rule. Rules ("at least 8 characters") become permanent helper text, only on screens that create data (sign up, change password). The sign-in screen has none.
7. **Word limits (measured by the audit):**

| Element | Limit |
|---|---|
| Screen title | 1-6 words, max 8 |
| Subtitle | 1 sentence, 16 words or fewer; omit if the title is enough |
| Body sentence | 20 words or fewer; paragraph 2 sentences or fewer |
| Button | 1-3 words, verb + object |
| Link | does not break across lines (`white-space: nowrap`) |

## Calibration (sign-in screen, bad original copy)

| Original | Problem | Fix |
|---|---|---|
| "Fill the bubble, beat the clock." | rhyme, metaphor, does not say the product | "Practice tests with a timer per section" (if in the PRD) |
| "Welcome back!" | greeting carries no information | "Sign in" |
| "Sign in to your account" | "to your account" adds nothing | "Sign in" |
| "Continue your running test or see your latest score." | an ad on a task page, two goals | delete, or "Resume your test or see your score." |
| Password placeholder "At least 8 characters" | a rule on the sign-in screen | leave empty; move the rule to Sign up |
| "Terms of service and Privacy policy" split across lines | broken link | `nowrap` or shorten |

## Check before handing over

Delete test (each sentence), brand-cover test (the product and next step are clear from the text alone), count test (table above), trace test (each claim to the PRD), repeat test (is the same info shown twice?).

Critic: copy score 1-5, each violation written as **quote of the original -> problem -> replacement**. The `ui-craft` audit measures title/sentence/button length, placeholders holding rules, repeated sentences, broken links, filler words and exclamation marks (run it with `--lang en` or an `<html lang="en">` page). Clarity of meaning is judged by the critic.
