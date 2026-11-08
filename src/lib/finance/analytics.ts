import type { Bill, Budget, Expense } from "./types";

export function billState(bill: Bill, asOf: string): "paid" | "pending" | "overdue" | "cancelled" {
  if (bill.status === "paid" || bill.status === "cancelled") return bill.status;
  return bill.dueDate < asOf ? "overdue" : "pending";
}
export function categoryTotals(entries: Expense[]): Array<{ category: string; cents: number }> {
  const sums = new Map<string, number>();
  for (const entry of entries) sums.set(entry.category, (sums.get(entry.category) ?? 0) + entry.amountCents);
  return [...sums].map(([category, cents]) => ({ category, cents })).sort((a, b) => b.cents - a.cents);
}
export function monthSummary(expenses: Expense[], bills: Bill[], budgets: Budget[], month: string, asOf: string) {
  const current = expenses.filter((e) => e.date.startsWith(month));
  const monthBills = bills.filter((b) => b.dueDate.startsWith(month));
  const totalCents = current.reduce((sum, e) => sum + e.amountCents, 0);
  const paidBills = monthBills.filter((b) => b.status === "paid");
  const unpaidBills = monthBills.filter((b) => b.status === "pending");
  const pendingCents = unpaidBills.reduce((sum, b) => sum + (b.plannedCents ?? 0), 0);
  const categories = categoryTotals(current);
  const budgetUse = budgets.map((budget) => ({
    ...budget, spentCents: categories.find((c) => c.category === budget.category)?.cents ?? 0,
  }));
  return {
    totalCents, transactionCount: current.length, paidCount: paidBills.length,
    openCount: unpaidBills.length,
    overdueCount: unpaidBills.filter((b) => billState(b, asOf) === "overdue").length,
    pendingCents, categories, budgetUse,
    upcoming: unpaidBills.filter((b) => b.dueDate >= asOf)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5),
  };
}
export function previousMonth(month: string) {
  const [year, part] = month.split("-").map(Number);
  return new Date(Date.UTC(year, part - 2, 1)).toISOString().slice(0, 7);
}
export function monthlyHistory(expenses: Expense[]) {
  const months = [...new Set(expenses.map((e) => e.date.slice(0, 7)))].sort();
  return months.map((month) => ({
    month, cents: expenses.filter((e) => e.date.startsWith(month))
      .reduce((sum, e) => sum + e.amountCents, 0),
  }));
}
export function spendingInsights(expenses: Expense[], month: string) {
  const current = categoryTotals(expenses.filter((e) => e.date.startsWith(month)));
  const past = categoryTotals(expenses.filter((e) => e.date.startsWith(previousMonth(month))));
  return current.flatMap((entry) => {
    const previous = past.find((p) => p.category === entry.category)?.cents ?? 0;
    if (previous <= 0 || entry.cents <= previous) return [];
    return [{ category: entry.category, increaseCents: entry.cents - previous,
      increasePercent: Math.round((entry.cents / previous - 1) * 100) }];
  }).sort((a, b) => b.increaseCents - a.increaseCents);
}
