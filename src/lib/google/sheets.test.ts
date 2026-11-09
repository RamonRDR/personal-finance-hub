import { afterEach, describe, expect, it, vi } from "vitest";
import { readSpreadsheetMetadata, readSpreadsheetRange } from "./sheets";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllGlobals());

describe("Google Sheets read-only HTTP boundary", () => {
  it("requests only authorized GET calls with no cache and no writes", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return { ok: true, json: async () => ({ values: [["Demo"]] }) };
      }),
    );
    const workbookId = "syntheticWorkbookIdentifierABC123";
    await readSpreadsheetMetadata(workbookId, "synthetic-token");
    await readSpreadsheetRange(workbookId, "Novembro 2026", 1, 1000, "synthetic-token");
    expect(calls).toHaveLength(2);
    for (const { url, init } of calls) {
      expect(url).toContain("https://sheets.googleapis.com/v4/spreadsheets/");
      expect(init.method ?? "GET").toBe("GET");
      expect(init.body).toBeUndefined();
      expect(init.cache).toBe("no-store");
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer synthetic-token");
      expect(url).not.toContain("synthetic-token");
    }
    expect(decodeURIComponent(calls[1].url)).toContain("'Novembro 2026'!A1:M1000");
    expect(calls[1].url).toContain("FORMATTED_VALUE");
  });

  it("rejects untrusted workbook IDs and ranges before contacting Google", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(readSpreadsheetMetadata("../../danger", "synthetic-token")).rejects.toThrow();
    await expect(
      readSpreadsheetRange("syntheticWorkbookIdentifierABC123", "Bad'!A1", 1, 2, "synthetic-token"),
    ).rejects.toThrow();
    await expect(
      readSpreadsheetRange(
        "syntheticWorkbookIdentifierABC123",
        "Novembro 2026",
        2,
        1002,
        "synthetic-token",
      ),
    ).rejects.toThrow();
    await expect(
      readSpreadsheetMetadata("syntheticWorkbookIdentifierABC123", ""),
    ).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it("fails safely on permission denial without returning the provider response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 403 })),
    );
    await expect(
      readSpreadsheetMetadata("syntheticWorkbookIdentifierABC123", "synthetic-token"),
    ).rejects.toThrow("Google Sheets read failed (403)");
  });
});
