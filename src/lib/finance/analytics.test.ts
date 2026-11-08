import { describe, expect, it } from "vitest";
import { demoSnapshot } from "../demo/data";
import { billState, monthSummary, previousMonth, spendingInsights } from "./analytics";
import { calendarPreview } from "./calendar-plan";
describe("financial logic", () => {
  it("derives overdue from a fixed date without changing payments", () => {
    expect(billState(demoSnapshot.bills[3], "2026-11-08")).toBe("overdue");
    expect(billState(demoSnapshot.bills[2], "2026-11-08")).toBe("paid");
  });
  it("excludes card invoice payments from consumption totals", () => {
    const result = monthSummary(demoSnapshot.expenses,demoSnapshot.bills,demoSnapshot.budgets,"2026-11","2026-11-08");
    expect(result.totalCents).toBe(76630);
    expect(result.paidCount).toBe(1);
    expect(result.overdueCount).toBe(1);
    expect(result.openCount).toBe(3);
  });
  it("compares periods safely", () => {
    expect(previousMonth("2026-01")).toBe("2025-12");
    expect(spendingInsights(demoSnapshot.expenses,"2026-11").length).toBeGreaterThan(0);
  });
  it("creates a dry run without duplicate operations", () => {
    const item = calendarPreview(demoSnapshot.bills.slice(0,1))[0];
    expect(item.action).toBe("create");
    expect(calendarPreview(demoSnapshot.bills.slice(0,1),{
      b1:{date:item.date,title:item.title}
    })[0].action).toBe("unchanged");
  });
});
