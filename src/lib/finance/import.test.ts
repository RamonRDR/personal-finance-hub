import { describe, expect, it } from "vitest";
import {
  importBills,
  importExpenses,
  deduplicateEntries,
  detectPotentialDuplicates,
} from "./import";

const rowsAfterHeader = (rowNumber: number, ...data: unknown[][]): unknown[][] => [
  ...Array.from({ length: rowNumber }, () => []),
  ...data,
];

describe("read-only Sheets normalization", () => {
  it("ignores daily totals and warns about malformed dates", () => {
    const result = importExpenses(
      "Novembro 2026",
      rowsAfterHeader(
        6,
        ["08/11/2026", "Mercado fictício", "Casa", "Pessoa A", "Pix", "Banco Demo", "R$ 42,50"],
        ["", "TOTAL DO DIA • 08/11/2026", "", "", "", "", "R$ 42,50"],
        ["32/11/2026", "Linha inválida", "Casa", "Pessoa A", "Pix", "Banco Demo", "R$ 2,00"],
      ),
    );
    expect(result.records).toHaveLength(1);
    expect(result.records[0].amountCents).toBe(4250);
    expect(result.warnings).toEqual([{ tab: "Novembro 2026", row: 9, code: "invalid-date" }]);
    expect(deduplicateEntries([result.records[0], result.records[0]])).toHaveLength(1);
  });

  it("recognizes installments by their due month instead of duplicating the full purchase date", () => {
    const result = importExpenses(
      "Cartões - Parceladas",
      rowsAfterHeader(
        10,
        [
          "15/10/2026",
          "Cartão Demo",
          "Notebook Fictício",
          "Compras",
          "Pessoa A",
          "1/3",
          "10/11/2026",
          "100,00",
        ],
        [
          "15/10/2026",
          "Cartão Demo",
          "Notebook Fictício",
          "Compras",
          "Pessoa A",
          "2/3",
          "10/12/2026",
          "100,00",
        ],
        [
          "15/10/2026",
          "Cartão Demo",
          "Notebook Fictício",
          "Compras",
          "Pessoa A",
          "3/3",
          "",
          "100,00",
        ],
      ),
    );
    expect(result.records.map((expense) => expense.date)).toEqual(["2026-11-10", "2026-12-10"]);
    expect(result.records.map((expense) => expense.purchaseDate)).toEqual([
      "2026-10-15",
      "2026-10-15",
    ]);
    expect(result.records.map((expense) => expense.installmentLabel)).toEqual(["1/3", "2/3"]);
    expect(result.warnings).toEqual([
      { tab: "Cartões - Parceladas", row: 13, code: "invalid-due-date" },
    ]);
  });

  it("preserves one-off purchases on purchase date and external expenses separately", () => {
    const card = importExpenses(
      "Cartões - Avulsas",
      rowsAfterHeader(6, [
        "01/10/2026",
        "Cartão Demo",
        "Loja Teste",
        "Compras",
        "Pessoa A",
        "Crédito",
        "10/11/2026",
        "55,00",
      ]),
    );
    const external = importExpenses(
      "Despesas Externas",
      rowsAfterHeader(6, ["05/11/2026", "", "Empresa", "Fornecedor Fictício", "Pessoa B", "90,00"]),
    );
    expect(card.records[0]).toMatchObject({
      date: "2026-10-01",
      amountCents: 5500,
      source: "card-oneoff",
    });
    expect(external.records[0]).toMatchObject({ source: "external", amountCents: 9000 });
  });

  it("flags semantic duplicates without deleting legitimate repeated purchases", () => {
    const result = importExpenses(
      "Novembro 2026",
      rowsAfterHeader(
        6,
        ["08/11/2026", "Loja  Fictícia", "Casa", "Pessoa A", "Pix", "Banco Demo", "42,50"],
        ["08/11/2026", "LOJA FICTÍCIA", "Casa", "Pessoa A", "Pix", "Banco Demo", "42,50"],
      ),
    );
    const warnings = detectPotentialDuplicates(result.records);
    expect(result.records).toHaveLength(2);
    expect(deduplicateEntries(result.records)).toHaveLength(2);
    expect(warnings).toEqual([{ tab: "Novembro 2026", row: 8, code: "possible-duplicate" }]);
  });

  it("reads card invoice status separately, never as consumption", () => {
    const result = importBills(
      "Faturas dos Cartões",
      rowsAfterHeader(6, [
        "11/2026",
        "Cartão Demo",
        "10/11/2026",
        0,
        80,
        80,
        80,
        80,
        "09/11/2026",
        "Pago",
      ]),
    );
    expect(result.records[0].status).toBe("paid");
    expect(result.records[0].plannedCents).toBe(8000);
  });

  it("preserves partial payments as pending instead of inventing settlement", () => {
    const result = importBills(
      "Contas Fixas e Vencimentos",
      rowsAfterHeader(6, [
        "11/2026",
        "Conta Fictícia",
        "Casa",
        "10/11/2026",
        "",
        "100,00",
        "40,00",
        "",
        "Parcial",
      ]),
    );
    expect(result.records[0]).toMatchObject({
      status: "pending",
      plannedCents: 10000,
      paidCents: 4000,
    });
  });

  it("does not interpret unexpected status or broken amounts as unpaid bills", () => {
    const result = importBills(
      "Contas Fixas e Vencimentos",
      rowsAfterHeader(
        6,
        [
          "11/2026",
          "Status inesperado",
          "Casa",
          "10/11/2026",
          "",
          "100,00",
          "",
          "",
          "FormulaError",
        ],
        ["11/2026", "Valor inválido", "Casa", "10/11/2026", "", "R$ ???", "", "", "Pendente"],
      ),
    );
    expect(result.records).toHaveLength(0);
    expect(result.warnings).toEqual([
      { tab: "Contas Fixas e Vencimentos", row: 7, code: "invalid-status" },
      { tab: "Contas Fixas e Vencimentos", row: 8, code: "invalid-money" },
    ]);
  });
});
