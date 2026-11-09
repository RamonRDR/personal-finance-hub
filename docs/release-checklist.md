# Release and integration readiness

This is a staged project, not a complete production finance tool.

## Completed and evidence-based

- [x] Inspect the public GitHub repository and preserve the MIT license
- [x] Inspect workbook metadata and selected headers/formulas read-only
- [x] Commit sanitized structural mapping without private identifiers
- [x] Strict TypeScript, Next.js, responsive UI and synthetic fixtures
- [x] Expense and bill normalization with header-sentinel validation
- [x] Household calculations, budget UI and calendar dry-run
- [x] PWA manifest, PNG icons, static-safe service worker
- [x] Unit, component and Playwright desktop/mobile browser tests
- [x] GitHub Actions CI with build, lint, formatting, typecheck and audit
- [x] English, Portuguese and Spanish README files
- [x] No Google write calls, deployment or merge

## Still pending before live use

- [ ] Provision private Google Cloud OAuth test credentials, restricted identity and encrypted session backend
- [ ] Validate the OAuth callback, read-only scopes, real workbook access and response mapping with consent

- [x] Implement Google OAuth login/logout with PKCE and owner-only identity checks (not yet activated)
- [x] Implement encrypted Redis-backed server sessions, expiry and server-side refresh (not yet provisioned)
- [ ] Full integration tests for expiry, refresh, revocation and permissions against an authorized test setup
- [x] Implement explicit authenticated read-only Sheets endpoint and UI source switch (not yet validated on live Google)
- [ ] Source field mapping approval, immutable IDs and write conflict strategy
- [ ] Backup + preview + explicitly approved real write mode
- [ ] Secure audit history and idempotent paid/expense operations
- [ ] Calendar API synchronization with opt-in, stable IDs and a dedicated calendar
- [ ] Real Google error, permission, quota and renewal testing
- [ ] PWA install check over HTTPS on real iOS and Android devices
- [ ] Production privacy review and controlled deployment, only with authorization
- [ ] Final self-review, Codex Review _only on explicit request_, and owner-approved merge

The sandbox demo does not prove the OAuth flow, external Google APIs, true
offline usability or installation on physical phones. Existing Google Sheets,
Calendar events and recurring reminder automations were not modified.
