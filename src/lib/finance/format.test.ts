import { describe, expect, it } from "vitest";
import { formatMoney, parseBrazilianDate, parseMoneyCents } from "./format";
describe("Brazilian format", () => {
  it("parses valid dates and rejects nonexistent days", () => {
    expect(parseBrazilianDate("08/11/2026")).toBe("2026-11-08");
    expect(parseBrazilianDate("31/02/2026")).toBeNull();
    expect(parseBrazilianDate("2026-11-08")).toBe("2026-11-08");
    expect(parseBrazilianDate("2026-02-31")).toBeNull();
  });
  it("supports cents, thousand separators and negative values", () => {
    expect(parseMoneyCents("R$ 1.234,56")).toBe(123456);
    expect(parseMoneyCents("- R$ 2,50")).toBe(-250);
    expect(parseMoneyCents("(R$ 10,00)")).toBe(-1000);
    expect(parseMoneyCents(45.75)).toBe(4575);
    expect(parseMoneyCents("1,2,3")).toBeNull();
    expect(formatMoney(100)).toContain("1,00");
  });
});
