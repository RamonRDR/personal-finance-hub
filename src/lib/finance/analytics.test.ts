import { describe, expect, it } from "vitest";
import { monthSummary, monthlyHistory, remainingBillCents, spendingInsights } from "./analytics";
import type { Bill, Expense } from "./types";

const bill: Bill = {
  id: "synthetic-bill",
  description: "Pagamento fictício",
  category: "Casa",
  dueDate: "2026-11-15",
  plannedCents: 10000,
  paidCents: 4000,
  paidAt: null,
  status: "pending",
  recurring: true,
};
const expenses: Expense[] = [
  {
    id: "fictional-one",
    date: "2026-11-10",
    description: "Exemplo de compra",
    category: "Casa",
    payer: null,
    method: "Pix",
    account: null,
    amountCents: 5000,
    source: "direct",
  },
  {
    id: "fictional-external",
    date: "2026-11-11",
    description: "Custo de exemplo externo",
    category: "Casa",
    payer: null,
    method: null,
    account: null,
    amountCents: 99000,
    source: "external",
  },
];

describe("monthly household accounting", () => {
  it("subtracts recorded partial payments from open balances", () => {
    expect(remainingBillCents(bill)).toBe(6000);
    const result = monthSummary(expenses, [bill], [], "2026-11", "2026-11-16");
    expect(result.totalCents).toBe(5000);
    expect(result.pendingCents).toBe(6000);
    expect(result.overdueCount).toBe(1);
    expect(result.openCount).toBe(1);
  });
  it("does not invent balances for missing planned amounts or negative remaining balances", () => {
    expect(remainingBillCents({ ...bill, plannedCents: null })).toBeNull();
    expect(remainingBillCents({ ...bill, paidCents: 12000 })).toBe(0);
    expect(remainingBillCents({ ...bill, status: "paid" })).toBeNull();
  });
  it("keeps business costs out of household history and insights", () => {
    expect(monthlyHistory(expenses)).toEqual([{ month: "2026-11", cents: 5000 }]);
    expect(spendingInsights(expenses, "2026-11")).toEqual([]);
  });
});
