import { describe, expect, it } from "vitest";
import { workbookReadiness } from "./readiness";

describe("Google Sheets import readiness", () => {
  it("allows a complete read-only workbook", () => {
    expect(workbookReadiness({ readOnly: true, warnings: [], failedTabs: [] })).toEqual({
      complete: true,
      warningCount: 0,
      failedTabCount: 0,
    });
  });

  it("blocks a partial or suspicious workbook before displaying totals", () => {
    expect(
      workbookReadiness({
        readOnly: true,
        warnings: [{ tab: "Novembro 2026", row: 7, code: "possible-duplicate" }],
        failedTabs: [],
      }).complete,
    ).toBe(false);
    expect(
      workbookReadiness({
        readOnly: true,
        warnings: [],
        failedTabs: ["Cartões - Parceladas"],
      }).complete,
    ).toBe(false);
  });
});
