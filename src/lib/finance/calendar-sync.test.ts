import { describe, expect, it } from "vitest";
import {
  calendarEventId,
  planCalendarSynchronization,
  type CalendarBill,
  type ManagedCalendarEvent,
} from "./calendar-sync";

const id = "9b6975f6-3037-4338-93e9-30a968b1d4e3";
const bill: CalendarBill = {
  stableId: id,
  description: "Conta de teste",
  dueDate: "2026-11-16",
  status: "pending",
};

function linked(): ManagedCalendarEvent {
  return {
    id: calendarEventId(id),
    summary: "Conta: Conta de teste",
    date: "2026-11-16",
    reminderMinutes: 1440,
    etag: "synthetic-etag",
    privateProperties: { app: "personal-finance-hub", billId: id },
  };
}

describe("calendar sync plan with durable identities", () => {
  it("produces deterministic create payload and exclusive end date", () => {
    const [plan] = planCalendarSynchronization([bill], [], "test@group.calendar.google.com");
    expect(plan.action).toBe("create");
    expect(plan.eventId).toBe(calendarEventId(id));
    expect(plan.payload.start.date).toBe("2026-11-16");
    expect(plan.payload.end.date).toBe("2026-11-17");
    expect(plan.payload.reminders.overrides[0].minutes).toBe(1440);
  });

  it("does not recreate an unchanged owned event", () => {
    const [plan] = planCalendarSynchronization(
      [bill],
      [linked()],
      "test@group.calendar.google.com",
    );
    expect(plan.action).toBe("unchanged");
  });

  it("updates an owned event with an ETag and prevents unowned modifications", () => {
    const [change] = planCalendarSynchronization(
      [{ ...bill, status: "paid" }],
      [linked()],
      "test@group.calendar.google.com",
    );
    expect(change.action).toBe("update");
    expect(change.expectedEtag).toBe("synthetic-etag");
    const [conflict] = planCalendarSynchronization(
      [bill],
      [{ ...linked(), privateProperties: undefined }],
      "test@group.calendar.google.com",
    );
    expect(conflict.action).toBe("conflict");
  });

  it("rejects primary calendar, volatile row IDs, duplicates and bad dates", () => {
    expect(() => planCalendarSynchronization([bill], [], "primary")).toThrow();
    expect(() =>
      planCalendarSynchronization([{ ...bill, stableId: "Novembro 2026:7" }], [], "dedicated"),
    ).toThrow();
    expect(() => planCalendarSynchronization([bill, bill], [], "dedicated")).toThrow();
    expect(() =>
      planCalendarSynchronization([{ ...bill, dueDate: "2026-02-30" }], [], "dedicated"),
    ).toThrow();
  });

  it("never deletes cancelled bills or unrelated calendar events", () => {
    const plan = planCalendarSynchronization(
      [{ ...bill, status: "cancelled" }],
      [linked()],
      "dedicated",
    );
    expect(plan).toEqual([]);
  });
});
