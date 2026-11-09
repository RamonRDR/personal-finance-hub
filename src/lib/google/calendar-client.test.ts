import { afterEach, describe, expect, it, vi } from "vitest";
import { applyCalendarChange } from "./calendar-client";
import { planCalendarSynchronization } from "../finance/calendar-sync";

vi.mock("server-only", () => ({}));

const bill = {
  stableId: "9b6975f6-3037-4338-93e9-30a968b1d4e3",
  description: "Assinatura fictícia",
  dueDate: "2026-11-18",
  status: "pending" as const,
};
const [creation] = planCalendarSynchronization([bill], [], "demo-calendar");
const gate = {
  approved: true,
  enabled: true,
  dedicatedCalendarId: "demo-calendar@group.calendar.google.com",
};

afterEach(() => vi.unstubAllGlobals());

describe("Calendar API transport (synthetic mocked responses only)", () => {
  it("requires a separate explicit approval gate", async () => {
    const fake = vi.fn();
    vi.stubGlobal("fetch", fake);
    await expect(
      applyCalendarChange(creation, "fake-token", { ...gate, enabled: false }),
    ).rejects.toThrow("explicit approval");
    await expect(
      applyCalendarChange(creation, "fake-token", { ...gate, approved: false }),
    ).rejects.toThrow("explicit approval");
    expect(fake).not.toHaveBeenCalled();
  });

  it("uses a deterministic create ID and reports an already-existing event as conflict", async () => {
    const fake = vi.fn(async () => ({ status: 409, ok: false }));
    vi.stubGlobal("fetch", fake);
    expect(await applyCalendarChange(creation, "fake-token", gate)).toEqual({
      status: "conflict",
      eventId: creation.eventId,
    });
    const [url, options] = fake.mock.calls[0];
    expect(url).toContain("demo-calendar%40group.calendar.google.com");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body).id).toBe(creation.eventId);
  });

  it("patches using If-Match and treats concurrent edits as conflicts", async () => {
    const existing = {
      id: creation.eventId,
      summary: "Old summary",
      date: "2026-11-18",
      reminderMinutes: 1440,
      etag: "test-etag",
      privateProperties: { app: "personal-finance-hub", billId: bill.stableId },
    };
    const [update] = planCalendarSynchronization([bill], [existing], "demo-calendar");
    const fake = vi.fn(async () => ({ status: 412, ok: false }));
    vi.stubGlobal("fetch", fake);
    expect(await applyCalendarChange(update, "fake-token", gate)).toEqual({
      status: "conflict",
      eventId: update.eventId,
    });
    const [, options] = fake.mock.calls[0];
    expect(options.method).toBe("PATCH");
    expect(options.headers["If-Match"]).toBe("test-etag");
  });
});
