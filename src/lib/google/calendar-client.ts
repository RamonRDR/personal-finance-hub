import "server-only";
import { calendarEventId, type CalendarSyncOperation } from "../finance/calendar-sync";

// This module has no public route. Real Calendar write mode is disabled pending
// specific consent, a dedicated calendar and a separately granted OAuth scope.
export interface CalendarWriteGate {
  approved: boolean;
  dedicatedCalendarId: string;
  enabled: boolean;
}

export type CalendarWriteResult =
  | { status: "created" | "updated" | "unchanged"; eventId: string }
  | { status: "conflict"; eventId: string };

export async function applyCalendarChange(
  operation: CalendarSyncOperation,
  accessToken: string,
  gate: CalendarWriteGate,
): Promise<CalendarWriteResult> {
  if (
    !gate.enabled ||
    !gate.approved ||
    !gate.dedicatedCalendarId ||
    gate.dedicatedCalendarId === "primary"
  ) {
    throw new Error("Calendar synchronization requires explicit approval and a dedicated calendar");
  }
  if (!accessToken) throw new Error("Calendar authorization required");
  if (operation.action === "unchanged") {
    return { status: "unchanged", eventId: operation.eventId };
  }
  if (operation.action === "conflict") {
    return { status: "conflict", eventId: operation.eventId };
  }
  if (
    operation.eventId !== operation.payload.id ||
    operation.eventId !== calendarEventId(operation.billId) ||
    operation.payload.extendedProperties.private.billId !== operation.billId ||
    operation.payload.extendedProperties.private.app !== "personal-finance-hub"
  ) {
    throw new Error("Calendar event identity mismatch");
  }
  if (operation.action === "update" && !operation.expectedEtag) {
    throw new Error("An event ETag is required for updates");
  }
  const target =
    "https://www.googleapis.com/calendar/v3/calendars/" +
    encodeURIComponent(gate.dedicatedCalendarId) +
    "/events" +
    (operation.action === "update" ? "/" + encodeURIComponent(operation.eventId) : "");
  const response = await fetch(target, {
    method: operation.action === "create" ? "POST" : "PATCH",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
      ...(operation.action === "update" ? { "If-Match": operation.expectedEtag! } : {}),
    },
    body: JSON.stringify(operation.payload),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 409 || response.status === 412) {
    return { status: "conflict", eventId: operation.eventId };
  }
  if (!response.ok) throw new Error("Calendar operation failed; no retry without reconciliation");
  return {
    status: operation.action === "create" ? "created" : "updated",
    eventId: operation.eventId,
  };
}
