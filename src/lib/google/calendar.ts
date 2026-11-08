import "server-only";
export const calendarWriteEnabled = false;
export function assertCalendarWriteEnabled(): never {
  throw new Error("Calendar synchronization is disabled pending explicit authorization");
}
