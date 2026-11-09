# Personal Finance Hub

[![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A privacy-conscious open-source personal finance PWA built with Next.js 16,
React 19 and strict TypeScript. By default, it is an **interactive synthetic
demo** with no live Google connection and no persistent mutations.

## Implemented

- Responsive dashboard, expense ledger, bills, budgets and reports.
- Brazilian currency/date normalization, installment due-month recognition,
  partial-payment balances, reviewed duplicates, category insights and invoice
  double-counting safeguards.
- Synthetic expense and mark-paid interactions with explicit field-level previews,
  duplicate warnings and confirmation (in-memory only).
- Calendar dry-run preview (no event writes).
- Feature-gated Google OAuth with PKCE, exact verified-owner allowlist,
  encrypted Redis-backed server session, logout/revocation and refresh logic.
- Authenticated **read-only** Sheets endpoint and explicit UI source switch.
  This path requires owner-provided private credentials and is **not yet
  validated with a real Google login or workbook**.
- PWA manifest, Android/iOS icons, static-safe service worker, and offline
  notice. Unit, component, Playwright and GitHub Actions checks.

## Local demo

Requires Node.js 22+ and npm. Run `npm ci`, `npm run dev`, then open
`http://localhost:3000`. No credentials needed. Run `npm test`,
`npm run lint`, `npm run typecheck`, `npm run build`, and
`npm run test:e2e` (after `npx playwright install chromium`).

## Private Google integration

See [private staging steps](docs/google-setup.md) and [security gates](docs/security.md).
The Google contract tests run with `npm run test:google` using synthetic fixtures
and do not request real credentials.
A separate Google Cloud OAuth client, HTTPS origin, owner allowlist and
encrypted Redis session service are needed for test activation. Never publish
financial identifiers, spreadsheet rows, credentials or secrets to GitHub.
Google Calendar writes and Sheets writes **are not available**.
The default demo never reads or changes personal financial data.

Also see [architecture](docs/architecture.md),
[sanitized workbook structure](docs/sheets-mapping.md),
[financial rules](docs/financial-rules.md) and
[release checklist](docs/release-checklist.md).

The PWA can be installed on supported browsers over HTTPS; actual
installation on iOS/Android devices is still unverified. No deployment or
merge has been authorized or performed. License: MIT.
