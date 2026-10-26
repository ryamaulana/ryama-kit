---
name: security-checklists
description: Use when code touches auth/sessions, file uploads, user input to DB or shell, APIs, payments, secrets/config, or third-party calls. Pick only the relevant section.
---

# Security checklists (use only the sections that match the change)

## Auth and sessions
- Passwords hashed (argon2/bcrypt), never logged. Rate-limit login/reset. Generic error messages.
- Tokens: short-lived, httpOnly+secure+sameSite cookies; rotate/invalidate on logout and password change.
- Authorization checked server-side on EVERY endpoint and object (IDOR check: can user A read user B's id?).

## Input and DB
- Validate type/length/format at the boundary. Parameterized queries only; no string-built SQL/shell.
- Output-encode user content (XSS); sanitize rich text; set CSP.

## File uploads
- Allowlist type by content, not extension; size limit; random server-side filename; store outside web root; no execution; scan if possible.

## API
- Auth required by default; explicit public routes. CORS allowlist, not `*` with credentials. Pagination and rate limits. No stack traces to clients.

## Secrets and config
- Secrets in env/secret manager, never in repo, logs, or frontend bundle. `.env.example` without values. Rotate anything leaked.
- Dependencies: pin versions; run `npm audit` / `pip-audit`.

## External calls / SSRF
- Allowlist hosts for server-side fetches; block internal IP ranges; timeouts.

## Payments / sensitive data
- Use provider-hosted fields; verify webhooks by signature; idempotency keys; never store card data; minimize and encrypt PII.

## Deployment
- HTTPS only, security headers, least-privilege DB user, backups tested, no debug mode in prod.
