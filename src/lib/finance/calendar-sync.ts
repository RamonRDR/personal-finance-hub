import { createHash } from "node:crypto";
import { parseBrazilianDate } from "./format";
import type { PaymentStatus } from "./types";

// Only durable UUIDs may identify events. Imported spreadsheet row numbers are NOT stable IDs.
export interface CalendarBill {
  stableId: string;
  description: string;
  dueDate: string;
  status: PaymentStatus;
}

export interface ManagedCalendarEvent {
  id: string;
  summary: string;
  date: string;
  reminderMinutes: number;
  etag?: string;
  privateProperties?: { app?: string; billId?: string };
}

export interface CalendarEventPayload {
  id: string;
  summary: string;
  start: { date: string };
  end: { date: string };
  reminders: { useDefault: false; overrides: Array<{ method: "popup"; minutes: number }> };
  extendedProperties: { private: { app: string; billId: string } };
}

export interface CalendarSyncOperation {
  action: "create" | "update" | "unchanged" | "conflict";
  billId: string;
  eventId: string;
  payload: CalendarEventPayload;
  expectedEtag?: string;
  reason?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const APP_ID = "personal-finance-hub";

export function calendarEventId(stableBillId: string): string {
  if (!UUID.test(stableBillId)) throw new Error("Calendar sync requires an immutable UUID");
  return "pfh" + createHash("sha256").update(APP_ID + ":" + stableBillId.toLowerCase()).digest("hex").slice(0, 32);
}

function nextDay(date: string): string {
  const value = new Date(date + "T12:00:00Z");
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

export function planCalendarSynchronization(
  bills: readonly CalendarBill[],
  existing: readonly ManagedCalendarEvent[],
  calendarId: string,
  reminderMinutes = 1440,
): CalendarSyncOperation[] {
  if (!calendarId || calendarId === "primary") {
    throw new Error("A dedicated, explicitly selected calendar is required");
  }
  if (!Number.isInteger(reminderMinutes) || reminderMinutes < 0 || reminderMinutes > 40320) {
    throw new Error("Invalid reminder interval");
  }
  const remote = new Map<string, ManagedCalendarEvent>();
  for (const event of existing) {
    if (remote.has(event.id)) throw new Error("Duplicate remote calendar event identifier");
    remote.set(event.id, event);
  }
  const seen = new Set<string>();
  const plan: CalendarSyncOperation[] = [];
  for (const bill of bills) {
    const stableId = bill.stableId.toLowerCase();
    const eventId = calendarEventId(stableId);
    if (seen.has(stableId)) throw new Error("Duplicate durable bill identifier");
    seen.add(stableId);
    if (bill.status === "cancelled") continue; // Never delete existing events automatically.
    const date = parseBrazilianDate(bill.dueDate);
    if (!date) throw new Error("Invalid bill due date");
    const summary = "Conta: " + bill.description + (bill.status === "paid" ? " (paga)" : "");
    const payload: CalendarEventPayload = {
      id: eventId,
      summary,
      start: { date },
      end: { date: nextDay(date) },
      reminders: {
        useDefault: false,
        overrides: [{ method: "popup", minutes: reminderMinutes }],
      },
      extendedProperties: { private: { app: APP_ID, billId: stableId } },
    };
    const found = remote.get(eventId);
    if (!found) {
      plan.push({ action: "create", billId: stableId, eventId, payload });
      continue;
    }
    if (
      found.privateProperties?.app !== APP_ID ||
      found.privateProperties.billId !== stableId
    ) {
      plan.push({
        action: "conflict",
        billId: stableId,
        eventId,
        payload,
        reason: "Event was not created for this bill by the app",
      });
      continue;
    }
    const same =
      found.date === date &&
      found.summary === summary &&
      found.reminderMinutes === reminderMinutes;
    if (same) {
      plan.push({ action: "unchanged", billId: stableId, eventId, payload });
    } else if (!found.etag) {
      plan.push({
        action: "conflict",
        billId: stableId,
        eventId,
        payload,
        reason: "Missing ETag for optimistic concurrency",
      });
    } else {
      plan.push({
        action: "update",
        billId: stableId,
        eventId,
        payload,
        expectedEtag: found.etag,
      });
    }
  }
  return plan;
}
