import { describe, expect, it } from "vitest";
import { importBills, importExpenses, deduplicateEntries } from "./import";
describe("read-only Sheets normalization", () => {
  it("ignores summaries, reads expense rows and reports malformed dates", () => {
    const rows: unknown[][] = Array.from({ length: 6 }, () => []);
    rows.push(["08/11/2026", "Mercado fictício", "Casa", "Pessoa A", "Pix", "Banco Demo", "R$ 42,50", ""]);
    rows.push(["", "TOTAL DO DIA • 08/11/2026", "", "", "", "", "R$ 42,50", ""]);
    rows.push(["32/11/2026", "Linha inválida", "Casa", "Pessoa A", "Pix", "Banco Demo", "R$ 2,00", ""]);
    const result = importExpenses("Novembro 2026", rows);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].amountCents).toBe(4250);
    expect(result.warnings).toEqual([{ tab: "Novembro 2026", row: 9, code: "invalid-date" }]);
    expect(deduplicateEntries([result.records[0],result.records[0]])).toHaveLength(1);
  });
  it("reads card invoice status separately, never as consumption", () => {
    const rows: unknown[][] = Array.from({ length: 6 }, () => []);
    rows.push(["11/2026", "Cartão Demo", "10/11/2026", 0, 80, 80, 80, 80, "09/11/2026", "Pago"]);
    const result = importBills("Faturas dos Cartões", rows);
    expect(result.records[0].status).toBe("paid");
    expect(result.records[0].plannedCents).toBe(8000);
  });
});
