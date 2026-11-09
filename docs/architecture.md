# Architecture

Next.js 16 App Router + TypeScript strict + responsive React UI. Finance
domain services are deterministic and independent of the spreadsheet layout.
Public mode is an interactive synthetic fixture, with no account required.

## Optional read-only Google path

User click → Google OAuth authorization code + PKCE and signed state →
verified allowed account → encrypted server-side Redis session → opaque
HttpOnly cookie → owner-initiated private GET /api/finance/snapshot →
server-only Sheets API read → header-validated normalizer → transient
in-memory browser view. Real token and spreadsheet identifier never enter
the browser. Logout revokes the server session; tokens refresh server-side.

This path is feature-gated and not yet configured or validated against live
Google. Google scopes are openid, email and spreadsheets.readonly only.
Failed or missing tabs surface mapping warnings. Partial snapshots must not
be treated as complete accounting totals.

## Mutation architecture (not yet activated)

A future write command needs stable source identity, field-level intent,
reviewable preview, a backup, lock or revision check, idempotency and an
auditable server-side operation before any narrowly scoped Google mutation.
There is no live Sheets write API in this build; demo changes remain local.

Calendar: account due dates → deterministic side-effect-free preview →
future owner-approved opt-in → dedicated calendar + durable event identity.
There are no Calendar API write calls today.

PWA caches only public offline assets and immutable static scripts. It
deliberately does not cache APIs, HTML with identity context, OAuth callbacks
or financial data. Physical device tests remain mandatory for release.

## Calendar integration boundary

The domain planner at `src/lib/finance/calendar-sync.ts` requires durable
UUIDs instead of transient sheet row numbers, deterministic remote event IDs
and a dedicated (non-primary) calendar. It proposes create/update/no-op or
conflict actions without deleting unrelated events. The separate server
Calendar transport enforces an explicit approval gate and uses ETags to avoid
silent concurrent updates. Tests run against mocked network responses only.
No API route calls the transport; the current Google OAuth does not request a
Calendar write scope, so real synchronization is not enabled.

## Financial safety refinement

The read adapter now preserves card-installment purchase dates and labels,
but recognizes installment spending in the installment due month. The
normalizer reports possible semantic duplicates without destroying either
row. Formula-status errors are not transformed into invented pending bills.
Pending balances subtract recorded partial payments.

The public UI uses a pure `previewFinanceChange` before simulated
financial changes. It displays changed fields and requires explicit
confirmation. The function rejects volatile row numbers as write IDs,
stale revisions, repeated idempotency keys and any Google read-only source.
This is an in-memory demo safety model; only a future persistent server-side
executor can enforce revisions and idempotency atomically on Google Sheets.
