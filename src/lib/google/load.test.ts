import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadReadOnlyWorkbook } from "./load";
import { readSpreadsheetMetadata, readSpreadsheetRange } from "./sheets";
import { EXPECTED_HEADERS, READ_TABS } from "../finance/workbook";
import { workbookReadiness } from "./readiness";

vi.mock("server-only", () => ({}));
vi.mock("./sheets", () => ({
  readSpreadsheetMetadata: vi.fn(),
  readSpreadsheetRange: vi.fn(),
}));

const syntheticRows = (name: string): unknown[][] => {
  const spec = EXPECTED_HEADERS[name];
  const rows: unknown[][] = Array.from({ length: spec.row }, () => []);
  for (const [column, label] of spec.sentinels) rows[spec.row - 1][column] = label;
  if (name === "Novembro 2026") {
    rows.push([
      "05/11/2026",
      "Compra de teste",
      "Supermercado",
      "Pessoa Teste",
      "Pix",
      "Conta Fictícia",
      "R$ 65,50",
    ]);
  }
  if (name === "Contas Fixas e Vencimentos") {
    rows.push([
      "11/2026",
      "Conta fictícia",
      "Casa",
      "15/11/2026",
      "",
      "120,00",
      "",
      "",
      "Pendente",
    ]);
  }
  return rows;
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(readSpreadsheetMetadata).mockResolvedValue({
    sheets: READ_TABS.map((title) => ({
      properties: { title, gridProperties: { rowCount: 50 } },
    })),
  });
  vi.mocked(readSpreadsheetRange).mockImplementation(async (_id, name) => ({
    values: syntheticRows(name),
  }));
});

describe("read-only workbook integration with synthetic Google responses", () => {
  it("loads every expected tab without writes and validates mapped totals", async () => {
    const value = await loadReadOnlyWorkbook("syntheticWorkbookIdentifierABC123", "fake-token");
    expect(readSpreadsheetMetadata).toHaveBeenCalledTimes(1);
    expect(readSpreadsheetRange).toHaveBeenCalledTimes(READ_TABS.length);
    expect(value.readOnly).toBe(true);
    expect(value.snapshot.mode).toBe("google-read-only");
    expect(value.snapshot.expenses).toHaveLength(1);
    expect(value.snapshot.expenses[0].amountCents).toBe(6550);
    expect(value.snapshot.bills).toHaveLength(1);
    expect(value.warnings).toEqual([]);
    expect(value.failedTabs).toEqual([]);
    expect(workbookReadiness(value).complete).toBe(true);
  });

  it("keeps partial network errors out of a complete financial view", async () => {
    vi.mocked(readSpreadsheetRange).mockImplementation(async (_id, name) => {
      if (name === "Cartões - Parceladas") throw new Error("quota error");
      return { values: syntheticRows(name) };
    });
    const value = await loadReadOnlyWorkbook("syntheticWorkbookIdentifierABC123", "fake-token");
    expect(value.failedTabs).toEqual(["Cartões - Parceladas"]);
    expect(value.warnings).toContainEqual({
      tab: "Cartões - Parceladas",
      row: 0,
      code: "missing-tab",
    });
    expect(workbookReadiness(value).complete).toBe(false);
  });

  it("detects header drift and missing tabs rather than guessing unknown columns", async () => {
    vi.mocked(readSpreadsheetMetadata).mockResolvedValue({
      sheets: READ_TABS.filter((title) => title !== "Cartões - Avulsas").map((title) => ({
        properties: { title, gridProperties: { rowCount: 20 } },
      })),
    });
    vi.mocked(readSpreadsheetRange).mockImplementation(async (_id, name) => {
      const rows = syntheticRows(name);
      if (name === "Novembro 2026") rows[5][1] = "Cabeçalho alterado";
      return { values: rows };
    });
    const value = await loadReadOnlyWorkbook("syntheticWorkbookIdentifierABC123", "fake-token");
    expect(value.snapshot.expenses).toEqual([]);
    expect(value.warnings).toContainEqual({
      tab: "Novembro 2026",
      row: 6,
      code: "invalid-header",
    });
    expect(value.warnings).toContainEqual({
      tab: "Cartões - Avulsas",
      row: 0,
      code: "missing-tab",
    });
    expect(workbookReadiness(value).complete).toBe(false);
  });
});
