import { describe, expect, it } from "vitest";
import { previewFinanceChange, type FinanceCommand } from "./write-preview";
import { demoSnapshot } from "../demo/data";
import type { Snapshot } from "./types";

const expenseId = "7dfb8d70-3cbd-4e54-93c7-8a76bb643d00";
const billId = "1ae127d6-e6c4-44ac-a0d5-a349b9cc5e7d";
const operationId = "48c1501b-e4b0-4350-a0eb-03872c982984";
const state: Snapshot = {
  ...demoSnapshot,
  expenses: demoSnapshot.expenses.map((entry) => ({ ...entry })),
  bills: demoSnapshot.bills.map((entry) => ({ ...entry })),
};
state.bills[0].id = billId;

const context = { currentRevision: "revision-test-1", processedOperationIds: new Set<string>() };
const add: FinanceCommand = {
  type: "add-expense",
  operationId,
  expectedRevision: context.currentRevision,
  expense: {
    id: expenseId,
    date: "2026-11-19",
    description: "Compra sintética",
    category: "Casa",
    payer: "Pessoa A",
    method: "Pix",
    account: "Banco Exemplo",
    amountCents: 1400,
    source: "direct",
  },
};

describe("safe financial change preview", () => {
  it("returns an immutable, explicit diff without mutating the input", () => {
    const before = JSON.stringify(state);
    const result = previewFinanceChange(state, add, context);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected a valid preview");
    expect(result.changes).toContainEqual({
      entity: "expense",
      id: expenseId,
      field: "amountCents",
      before: null,
      after: 1400,
    });
    expect(result.proposedSnapshot.expenses).toHaveLength(state.expenses.length + 1);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("rejects any financial mutation against a read-only Google snapshot", () => {
    const result = previewFinanceChange({ ...state, mode: "google-read-only" }, add, context);
    expect(result).toEqual({ status: "blocked", reason: "read-only" });
  });

  it("rejects stale revisions and repeated idempotency keys", () => {
    expect(
      previewFinanceChange(state, add, {
        currentRevision: "new-server-revision",
        processedOperationIds: new Set(),
      }),
    ).toEqual({ status: "blocked", reason: "conflict" });
    expect(
      previewFinanceChange(state, add, {
        currentRevision: context.currentRevision,
        processedOperationIds: new Set([operationId]),
      }),
    ).toEqual({ status: "blocked", reason: "replayed" });
  });

  it("never considers worksheet row numbers to be durable write identities", () => {
    const command: FinanceCommand = {
      type: "mark-bill-paid",
      operationId,
      expectedRevision: context.currentRevision,
      billId: "Contas Fixas e Vencimentos:7",
      amountCents: 18000,
      paidAt: "2026-11-09",
    };
    expect(previewFinanceChange(state, command, context)).toEqual({
      status: "blocked",
      reason: "invalid",
    });
  });

  it("plans an explicit payment update, but prevents a second settlement", () => {
    const command: FinanceCommand = {
      type: "mark-bill-paid",
      operationId,
      expectedRevision: context.currentRevision,
      billId,
      amountCents: 17400,
      paidAt: "2026-11-09",
    };
    const result = previewFinanceChange(state, command, context);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected a valid preview");
    expect(result.changes.find((change) => change.field === "paidCents")).toMatchObject({
      before: null,
      after: 17400,
    });
    expect(result.proposedSnapshot.bills[0]).toMatchObject({
      status: "paid",
      paidCents: 17400,
      paidAt: "2026-11-09",
    });
    expect(previewFinanceChange(result.proposedSnapshot, command, context)).toEqual({
      status: "blocked",
      reason: "conflict",
    });
  });

  it("flags a likely duplicate and requires separate acknowledgment", () => {
    const original = add.expense;
    const first = previewFinanceChange(state, add, context);
    if (first.status !== "ready") throw new Error("Expected first preview");
    const next: FinanceCommand = {
      ...add,
      operationId: "828066d4-83f1-41d8-a3c2-b2edc2b8f289",
      expense: { ...original, id: "7a66d4ad-c180-40e3-b376-889ae8651509" },
    };
    expect(previewFinanceChange(first.proposedSnapshot, next, context)).toEqual({
      status: "blocked",
      reason: "possible-duplicate",
    });
    expect(
      previewFinanceChange(
        first.proposedSnapshot,
        { ...next, duplicateAcknowledged: true },
        context,
      ).status,
    ).toBe("ready");
  });

  it("rejects unsupported amounts, dates and missing bill identifiers", () => {
    expect(
      previewFinanceChange(
        state,
        { ...add, expense: { ...add.expense, amountCents: NaN } },
        context,
      ),
    ).toEqual({ status: "blocked", reason: "invalid" });
    expect(
      previewFinanceChange(
        state,
        {
          type: "mark-bill-paid",
          operationId,
          expectedRevision: context.currentRevision,
          billId,
          amountCents: 10000,
          paidAt: "2026-02-30",
        },
        context,
      ),
    ).toEqual({ status: "blocked", reason: "invalid" });
  });
});
