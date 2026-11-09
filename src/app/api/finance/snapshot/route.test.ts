import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { googleConfig } from "@/lib/google/config";
import { authorizedGoogleToken } from "@/lib/google/auth";
import { loadReadOnlyWorkbook } from "@/lib/google/load";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/google/config", () => ({ googleConfig: vi.fn() }));
vi.mock("@/lib/google/auth", () => ({
  authorizedGoogleToken: vi.fn(),
  PRIVATE_HEADERS: {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    Vary: "Cookie",
  },
}));
vi.mock("@/lib/google/load", () => ({ loadReadOnlyWorkbook: vi.fn() }));

const request = () => new NextRequest("https://example.com/api/finance/snapshot");

afterEach(() => vi.resetAllMocks());

describe("protected financial snapshot endpoint", () => {
  it("does not contact Google when the integration is off", async () => {
    vi.mocked(googleConfig).mockReturnValue(null);
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(authorizedGoogleToken).not.toHaveBeenCalled();
    expect(loadReadOnlyWorkbook).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated reads without returning any financial rows", async () => {
    vi.mocked(googleConfig).mockReturnValue({ spreadsheetId: "syntheticWorkbookId" } as ReturnType<
      Exclude<typeof googleConfig, undefined>
    >);
    vi.mocked(authorizedGoogleToken).mockResolvedValue(null);
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Google login required" });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(loadReadOnlyWorkbook).not.toHaveBeenCalled();
  });

  it("exposes a synthetic complete snapshot only to the authorized session", async () => {
    vi.mocked(googleConfig).mockReturnValue({ spreadsheetId: "syntheticWorkbookId" } as ReturnType<
      Exclude<typeof googleConfig, undefined>
    >);
    vi.mocked(authorizedGoogleToken).mockResolvedValue("synthetic-token");
    vi.mocked(loadReadOnlyWorkbook).mockResolvedValue({
      readOnly: true,
      failedTabs: [],
      warnings: [],
      snapshot: {
        mode: "google-read-only",
        lastSyncedAt: null,
        expenses: [],
        bills: [],
        budgets: [],
      },
    });
    const response = await GET(request());
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.complete).toBe(true);
    expect(result.snapshot.mode).toBe("google-read-only");
    expect(result.snapshot.lastSyncedAt).toEqual(expect.any(String));
    expect(JSON.stringify(result)).not.toContain("synthetic-token");
    expect(loadReadOnlyWorkbook).toHaveBeenCalledWith("syntheticWorkbookId", "synthetic-token");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("fails closed when Google APIs or parsing are unavailable", async () => {
    vi.mocked(googleConfig).mockReturnValue({ spreadsheetId: "syntheticWorkbookId" } as ReturnType<
      Exclude<typeof googleConfig, undefined>
    >);
    vi.mocked(authorizedGoogleToken).mockResolvedValue("synthetic-token");
    vi.mocked(loadReadOnlyWorkbook).mockRejectedValue(new Error("fake provider details"));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("fake provider details");
  });
});
