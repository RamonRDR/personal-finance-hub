import { parseBrazilianDate } from "./format";
import type { Expense, Snapshot } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type FinanceCommand =
  | {
      type: "add-expense";
      operationId: string;
      expectedRevision: string;
      expense: Expense;
      duplicateAcknowledged?: boolean;
    }
  | {
      type: "mark-bill-paid";
      operationId: string;
      expectedRevision: string;
      billId: string;
      amountCents: number;
      paidAt: string;
    };

export interface PreviewContext {
  /** Must originate from an authoritative store and change after every real mutation. */
  currentRevision: string;
  /** Persisted server-side for any future real write path. */
  processedOperationIds: ReadonlySet<string>;
}

export interface FieldChange {
  entity: "expense" | "bill";
  id: string;
  field: string;
  before: string | number | null;
  after: string | number | null;
}

export type WritePreview =
  | {
      status: "ready";
      operationId: string;
      expectedRevision: string;
      changes: FieldChange[];
      proposedSnapshot: Snapshot;
    }
  | {
      status: "blocked";
      reason: "read-only" | "conflict" | "replayed" | "invalid" | "possible-duplicate";
    };

const blocked = (reason: Extract<WritePreview, { status: "blocked" }>["reason"]): WritePreview => ({
  status: "blocked",
  reason,
});

function matchesExistingExpense(candidate: Expense, entry: Expense): boolean {
  const canonical = (value: string | null | undefined) =>
    (value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
  return (
    candidate.date === entry.date &&
    candidate.source === entry.source &&
    candidate.amountCents === entry.amountCents &&
    canonical(candidate.description) === canonical(entry.description) &&
    canonical(candidate.account) === canonical(entry.account) &&
    canonical(candidate.payer) === canonical(entry.payer)
  );
}

/**
 * Pure change preview for synthetic/demo fixtures. Never calls an external API.
 *
 * Sheet-derived row IDs fail the UUID rule for writes. A future real write adapter
 * must allocate durable IDs, prove a verified backup and enforce the same
 * authoritative revision/idempotency preconditions atomically on the server.
 */
export function previewFinanceChange(
  snapshot: Snapshot,
  command: FinanceCommand,
  context: PreviewContext,
): WritePreview {
  if (snapshot.mode !== "demo") return blocked("read-only");
  if (
    !UUID.test(command.operationId) ||
    !command.expectedRevision.trim() ||
    !context.currentRevision.trim()
  )
    return blocked("invalid");
  if (context.processedOperationIds.has(command.operationId)) return blocked("replayed");
  if (command.expectedRevision !== context.currentRevision) return blocked("conflict");

  if (command.type === "add-expense") {
    const expense = command.expense;
    if (
      !UUID.test(expense.id) ||
      !parseBrazilianDate(expense.date) ||
      !expense.description.trim() ||
      expense.description.length > 250 ||
      !Number.isSafeInteger(expense.amountCents) ||
      expense.amountCents <= 0 ||
      (expense.source !== "direct" && expense.source !== "external")
    )
      return blocked("invalid");
    if (snapshot.expenses.some((entry) => entry.id === expense.id)) return blocked("conflict");
    if (
      !command.duplicateAcknowledged &&
      snapshot.expenses.some((entry) => matchesExistingExpense(expense, entry))
    )
      return blocked("possible-duplicate");
    return {
      status: "ready",
      operationId: command.operationId,
      expectedRevision: command.expectedRevision,
      changes: [
        {
          entity: "expense",
          id: expense.id,
          field: "record",
          before: null,
          after: expense.description,
        },
        {
          entity: "expense",
          id: expense.id,
          field: "amountCents",
          before: null,
          after: expense.amountCents,
        },
      ],
      proposedSnapshot: { ...snapshot, expenses: [...snapshot.expenses, { ...expense }] },
    };
  }

  if (
    !UUID.test(command.billId) ||
    !Number.isSafeInteger(command.amountCents) ||
    command.amountCents <= 0 ||
    parseBrazilianDate(command.paidAt) !== command.paidAt
  )
    return blocked("invalid");
  const bill = snapshot.bills.find((entry) => entry.id === command.billId);
  if (!bill) return blocked("invalid");
  if (bill.status !== "pending") return blocked("conflict");
  return {
    status: "ready",
    operationId: command.operationId,
    expectedRevision: command.expectedRevision,
    changes: [
      { entity: "bill", id: bill.id, field: "status", before: "pending", after: "paid" },
      {
        entity: "bill",
        id: bill.id,
        field: "paidCents",
        before: bill.paidCents,
        after: command.amountCents,
      },
      {
        entity: "bill",
        id: bill.id,
        field: "paidAt",
        before: bill.paidAt,
        after: command.paidAt,
      },
    ],
    proposedSnapshot: {
      ...snapshot,
      bills: snapshot.bills.map((entry) =>
        entry.id === bill.id
          ? { ...entry, status: "paid", paidCents: command.amountCents, paidAt: command.paidAt }
          : entry,
      ),
    },
  };
}
