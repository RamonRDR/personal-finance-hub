# Financial calculations and ledger policy

The public demonstration uses **fictional records only**. Its calculations are
deterministic and never assert that recorded expenses represent a complete
bank or card statement.

## Household spending

- Household expense totals include direct purchases and individual card
  purchases with a valid transaction date and numeric amount.
- Card invoice settlements are **liabilities**. Paying an invoice must not
  count card purchases a second time.
- External/business expenses are a separate ledger and excluded from the
  household spending total, monthly history and category insights.
- A card subscription configured for a recurring charge does not prove a
  payment occurred, so subscriptions are not automatically counted as spent.
- Rows marked as daily subtotals are presentation and are skipped during
  import. Formulas are never overwritten.
- Invalid dates, values or headers cause warnings or rejection, not invented
  amounts. Source row numbers are **not durable transaction IDs**.

## Bills and status

- `Paid` is an explicit recorded payment state.
- `Overdue` is derived when a still-pending bill has a date before the
  evaluation date. The app never assumes a payment merely because a bill is due.
- `Cancelled` is represented only if explicitly indicated.
- Pending amount sums known planned amounts; missing values are not
  individually converted into an asserted payment or charge.
- A bill is not itself the same entity as the purchase that originated it.

## Comparisons and budgets

- A monthly comparison uses the preceding calendar month and only shows a
  percentage change when the previous period has a nonzero spending baseline.
- Category usage is actual known household spending divided by the configured
  category budget; exceeding a limit is not automatically a bad purchase.
- Insights rank increases between months using recorded transactions and
  make no predictions of guaranteed savings.

## Write-safe roadmap

Future edits require stable immutable keys, explicit field-level diffs,
a verified backup, formula-aware targeting, optimistic concurrency checks,
idempotency keys and an audit trail. The current public build has **no live
write endpoints** and cannot mutate a Google workbook or calendar.

## Installments, partial payments and reviewable duplicates

- Card installment rows use **their installment due date** for per-month
  recognition; the original purchase date and installment label are preserved
  as source metadata. This is an installment-ledger policy, not a bank
  transaction settlement claim.
- One-off card purchases continue using the purchase date; paid invoices do
  not appear again as household consumption.
- A pending bill with a known partial paid amount contributes only
  `max(0, planned - paid)` to the open balance. Unknown planned amounts stay
  unknown and must not become asserted charges.
- Unexpected status formulas, malformed amounts and missing installment due
  dates generate explicit import warnings. Invalid records are **not**
  silently converted to pending bills or assigned arbitrary dates.
- Identical-looking transactions are reported as **possible duplicates**.
  They remain separate until explicitly reviewed, since two identical
  legitimate purchases can occur.

## Safe mutation preview implemented for the demo

The UI shows an explicit field-level preview before a synthetic expense
or payment is confirmed. `previewFinanceChange` is pure and prevents
mutations against Google read-only snapshots. It requires randomly generated
UUID identities for commands and entities, an authoritative expected
revision and an idempotency-key history. It rejects stale revisions,
replayed operations, already-paid bills and suspicious duplicates unless
the duplicate is individually acknowledged.

This preview is **not** a live write guarantee: it does not allocate
persistent IDs to the existing workbook, issue a spreadsheet backup or
atomically enforce Google Sheets cell revisions. A real write executor will
require durable storage, server-side validation and source formula mapping.
No real write route has been enabled.
