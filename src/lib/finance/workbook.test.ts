import { describe, expect, it } from "vitest";
import { normalizeReadOnlyWorkbook } from "./workbook";

function fixture() {
  const monthly: unknown[][] = Array.from({ length: 6 }, () => []);
  monthly[5] = [
    "Data",
    "Descrição",
    "Categoria",
    "Quem comprou",
    "Forma de pagamento",
    "Banco",
    "Valor (R$)",
    "Observações",
  ];
  monthly.push([
    "08/11/2026",
    "Mercado de Exemplo",
    "Supermercado",
    "Pessoa Exemplo",
    "Pix",
    "Banco Demo",
    "R$ 150,00",
    "",
  ]);
  const accounts: unknown[][] = Array.from({ length: 6 }, () => []);
  accounts[5] = [
    "Competência",
    "Conta",
    "Âmbito",
    "Vencimento",
    "Avisar em",
    "Previsto (R$)",
    "Pago (R$)",
    "Data pagamento",
    "Situação",
    "Modalidade",
    "Banco",
    "Reembolso",
    "Observações",
  ];
  accounts.push([
    "11/2026",
    "Conta de Exemplo",
    "Casa",
    "10/11/2026",
    "08/11/2026",
    "R$ 60,00",
    "",
    "",
    "Pendente",
  ]);
  return { monthly, accounts };
}

describe("workbook mapping validation", () => {
  it("normalizes valid headers and never includes invoice payments in expenses", () => {
    const data = fixture();
    const result = normalizeReadOnlyWorkbook({
      "Novembro 2026": data.monthly,
      "Contas Fixas e Vencimentos": data.accounts,
    });
    expect(result.snapshot.mode).toBe("google-read-only");
    expect(result.snapshot.expenses).toHaveLength(1);
    expect(result.snapshot.expenses[0].amountCents).toBe(15000);
    expect(result.snapshot.bills).toHaveLength(1);
    expect(result.snapshot.bills[0].plannedCents).toBe(6000);
    expect(result.warnings.some((w) => w.code === "missing-tab")).toBe(true);
  });
  it("rejects changed headers rather than reading wrong financial columns", () => {
    const data = fixture();
    data.monthly[5] = ["Data", "Descrição errada"];
    const result = normalizeReadOnlyWorkbook({ "Novembro 2026": data.monthly });
    expect(result.snapshot.expenses).toHaveLength(0);
    expect(result.warnings).toContainEqual({
      tab: "Novembro 2026",
      row: 6,
      code: "invalid-header",
    });
  });
  it("reports repeated transactions as warnings without erasing possible real purchases", () => {
    const data = fixture();
    data.monthly.push([...data.monthly[6]]);
    const result = normalizeReadOnlyWorkbook({ "Novembro 2026": data.monthly });
    expect(result.snapshot.expenses).toHaveLength(2);
    expect(result.warnings).toContainEqual({
      tab: "Novembro 2026",
      row: 8,
      code: "possible-duplicate",
    });
  });
});
