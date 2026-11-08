import type { Bill } from "./types";
export interface CalendarPreview {
  billId: string;
  title: string;
  date: string;
  action: "create" | "update" | "unchanged";
}
// Pure dry-run only. No Google Calendar write calls.
export function calendarPreview(
  bills: Bill[],
  linkedEvents: Record<string, { date: string; title: string }> = {},
): CalendarPreview[] {
  return bills
    .filter((b) => b.status !== "cancelled")
    .map((bill) => {
      const title = "Conta: " + bill.description + (bill.status === "paid" ? " (paga)" : "");
      const existing = linkedEvents[bill.id];
      const action = !existing
        ? "create"
        : existing.date === bill.dueDate && existing.title === title
          ? "unchanged"
          : "update";
      return { billId: bill.id, title, date: bill.dueDate, action };
    });
}
