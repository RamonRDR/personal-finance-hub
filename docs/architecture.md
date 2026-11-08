# Architecture

Next.js App Router + TypeScript strict + responsive React interface.
The finance domain is independent of Google spreadsheet layouts. Input
boundaries are normalized by typed adapters into expenses, bills and budgets.
Deterministic services calculate overdue status, monthly summaries, category
breakdowns and Calendar dry-runs. All demo figures are fictional.

Read flow: future authorized Google session -> read-only Sheets API ->
normalizer -> finance domain -> browser UI. Real Google integration is NOT
activated or validated yet. Public demo uses only synthetic fixtures.

Write flow (future, gated): authenticated actor -> validated command ->
reviewable diff -> backup -> durable idempotency and revision checks ->
narrow scoped Google mutation -> audit log. No write path currently exists.

Calendar flow (future, gated): account due dates -> side-effect-free preview ->
owner approval -> separate destination calendar -> durable event IDs ->
confirmed sync. Today only the preview exists.

ADR-001: no database in synthetic demo. For live OAuth, select a secure,
durable, server-side encrypted credential/session store before activation.
Do not use process memory, localStorage, or a cache as financial source of truth.

PWA worker caches only versioned static scripts/styles and its public
offline notice. API responses, OAuth and finance data are always network-only.
