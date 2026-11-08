# Personal Finance Hub

[![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A privacy-conscious open-source personal finance PWA built with Next.js 16,
React 19 and TypeScript. The current version is an **interactive public demo**
with fictional data. It does **not** connect to Google accounts, change real
spreadsheets or create Calendar events.

## Features currently implemented

- Responsive dashboard, expense ledger, bills, budgets and reporting screens.
- BRL and Brazilian date parsing, category totals, month comparisons and
  deterministic spending insights.
- Synthetic add-expense and mark-as-paid demo interactions (in-memory only).
- Google Calendar **dry-run** preview with no real event writes.
- Read-only Google Sheets client code and documented workbook structure,
  pending secure OAuth activation.
- PWA manifest, PNG icons, safe service worker, offline notice and mobile UI.
- Unit, component and browser test suites, plus GitHub Actions CI.

## Quick start

Requirements: Node.js 24 (or compatible 22+) and npm.

1. Run npm ci
2. Run npm run dev
3. Open http://localhost:3000

No credentials are required. Test with npm test, npm run lint,
npm run typecheck, npm run build and npm run test:e2e
(after npx playwright install chromium).

## Architecture and data governance

Read [the architecture](docs/architecture.md),
[the real workbook's sanitized structural mapping](docs/sheets-mapping.md),
[security gates](docs/security.md) and
[Google configuration checklist](docs/google-setup.md).
Only synthetically generated demo data appears in the repository.
The real workbook is never written to. Card invoices are not automatically
counted as extra purchases.

The live Google OAuth and token store, spreadsheet write functionality,
Calendar writes, conflict-safe sync and real mobile PWA verification
**remain to be implemented and authorized**. This is not a complete
production-ready integration.

## PWA installation

When hosted on HTTPS with a supported browser, use the browser's install
option on Android or Safari's Share > Add to Home Screen on iPhone.
PNG icons are provided for Android (192px and 512px) and iOS (180px);
physical-device validation remains a release gate. Offline mode displays
a public connectivity notice; it does not store transactions.

No deployment occurs automatically. Never use personal financial data in
the public demo. This project is available under the MIT License.
