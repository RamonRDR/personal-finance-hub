import { deduplicateEntries, importBills, importExpenses, SHEETS } from "./import";
import type { ImportWarning, Snapshot } from "./types";

export const EXPECTED_HEADERS: Record<string, { row: number; sentinels: Array<[number, string]> }> = {
  "Outubro 2026": {
    row: 6,
    sentinels: [[0, "Data"], [1, "Descrição"], [6, "Valor (R$)"]],
  },
  "Novembro 2026": {
    row: 6,
    sentinels: [[0, "Data"], [1, "Descrição"], [6, "Valor (R$)"]],
  },
  "Dezembro 2026": {
    row: 6,
    sentinels: [[0, "Data"], [1, "Descrição"], [6, "Valor (R$)"]],
  },
  "Cartões - Avulsas": {
    row: 6,
    sentinels: [[0, "Data da compra"], [2, "Descrição da compra"], [7, "Valor avulso (R$)"]],
  },
  "Cartões - Parceladas": {
    row: 10,
    sentinels: [[0, "Data da compra"], [2, "Descrição da compra"], [7, "Valor da parcela (R$)"]],
  },
  "Despesas Externas": {
    row: 6,
    sentinels: [[0, "Data do pagamento"], [3, "Descrição / fornecedor"], [5, "Valor (R$)"]],
  },
  "Contas Fixas e Vencimentos": {
    row: 6,
    sentinels: [[1, "Conta"], [3, "Vencimento"], [8, "Situação"]],
  },
  "Faturas dos Cartões": {
    row: 6,
    sentinels: [[1, "Cartão"], [2, "Vencimento"], [9, "Situação"]],
  },
};

export const READ_TABS = Object.keys(EXPECTED_HEADERS);
export type WorkbookRows = Record<string, unknown[][]>;

function headerMatches(tab: string, rows: unknown[][]): boolean {
  const spec = EXPECTED_HEADERS[tab];
  const row = rows[spec.row - 1] ?? [];
  return spec.sentinels.every(([column, title]) => String(row[column] ?? "").trim() === title);
}

export function normalizeReadOnlyWorkbook(tabs: WorkbookRows): {
  snapshot: Snapshot;
  warnings: ImportWarning[];
} {
  const warnings: ImportWarning[] = [];
  const expenses: Snapshot["expenses"] = [];
  const bills: Snapshot["bills"] = [];

  for (const tab of READ_TABS) {
    const rows = tabs[tab];
    if (!rows) {
      warnings.push({ tab, row: 0, code: "missing-tab" });
      continue;
    }
    if (!headerMatches(tab, rows)) {
      warnings.push({ tab, row: EXPECTED_HEADERS[tab].row, code: "invalid-header" });
      continue;
    }
    if (tab in SHEETS) {
      const parsed = importExpenses(tab as keyof typeof SHEETS, rows);
      expenses.push(...parsed.records);
      warnings.push(...parsed.warnings);
    } else if (tab === "Contas Fixas e Vencimentos") {
      const parsed = importBills(tab, rows);
      bills.push(...parsed.records);
      warnings.push(...parsed.warnings);
    }
    // "Faturas dos Cartões" is inspected for header drift, but intentionally
    // excluded from the payable ledger: it can duplicate card bills already
    // present in "Contas Fixas e Vencimentos".
  }

  return {
    snapshot: {
      expenses: deduplicateEntries(expenses),
      bills,
      budgets: [],
      lastSyncedAt: null,
      mode: "google-read-only",
    },
    warnings,
  };
}
