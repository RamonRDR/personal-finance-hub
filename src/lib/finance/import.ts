import { parseBrazilianDate, parseMoneyCents } from "./format";
import type { Bill, Expense, ImportResult, ImportWarning, LedgerSource } from "./types";

export const SHEETS = {
  "Outubro 2026": { header: 6, kind: "direct" },
  "Novembro 2026": { header: 6, kind: "direct" },
  "Dezembro 2026": { header: 6, kind: "direct" },
  "Cartões - Avulsas": { header: 6, kind: "card-oneoff" },
  "Cartões - Parceladas": { header: 10, kind: "card-installment" },
  "Despesas Externas": { header: 6, kind: "external" },
} as const;

export function importExpenses(tab: keyof typeof SHEETS, rows: unknown[][]): ImportResult<Expense> {
  const config = SHEETS[tab];
  const records: Expense[] = [];
  const warnings: ImportWarning[] = [];
  const seen = new Set<string>();
  for (let index = config.header; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const direct = config.kind === "direct"; const external = config.kind === "external";
    const description = String(row[direct ? 1 : external ? 3 : 2] ?? "").trim();
    const rawValue = row[direct ? 6 : external ? 5 : 7];
    const category = String(row[direct ? 2 : external ? 2 : 3] ?? "").trim();
    const date = parseBrazilianDate(row[0]);
    const amountCents = parseMoneyCents(rawValue);
    if (/^(TOTAL DO DIA|TOTAL|BETH •|RAMON •)/i.test(description)) continue;
    if (!description && (rawValue === "" || rawValue == null)) continue;
    if (!date) {
      if (description || rawValue != null) warnings.push({ tab, row: index + 1, code: "invalid-date" });
      continue;
    }
    if (!description) { warnings.push({ tab, row: index + 1, code: "missing-description" }); continue; }
    if (amountCents === null) { warnings.push({ tab, row: index + 1, code: "invalid-money" }); continue; }
    // Row IDs are transient READ identifiers. Never use them as write identifiers after sorting.
    const id = tab + ":" + (index + 1);
    if (seen.has(id)) { warnings.push({ tab, row: index + 1, code: "duplicate" }); continue; }
    seen.add(id);
    records.push({
      id, date, description, category: category || "Sem categoria",
      payer: String(row[direct ? 3 : external ? 4 : 4] ?? "").trim() || null,
      method: direct ? String(row[4] ?? "").trim() || null : null,
      account: direct ? String(row[5] ?? "").trim() || null : external ? null :
        String(row[1] ?? "").trim() || null,
      amountCents, source: config.kind as LedgerSource,
    });
  }
  return { records, warnings };
}

export function importBills(
  tab: "Contas Fixas e Vencimentos" | "Faturas dos Cartões", rows: unknown[][],
): ImportResult<Bill> {
  const records: Bill[] = []; const warnings: ImportWarning[] = [];
  for (let index = 6; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const invoice = tab === "Faturas dos Cartões";
    const description = String(row[1] ?? "").trim();
    const date = parseBrazilianDate(row[invoice ? 2 : 3]);
    if (!description && !date) continue;
    if (!date) { warnings.push({ tab, row: index + 1, code: "invalid-date" }); continue; }
    const rawStatus = String(row[invoice ? 9 : 8] ?? "").trim().toLowerCase();
    const status = /cancelad/.test(rawStatus) ? "cancelled" :
      /pago|quitad/.test(rawStatus) ? "paid" : "pending";
    records.push({
      id: tab + ":" + (index + 1), dueDate: date,
      description: description || "Conta sem descrição",
      category: invoice ? "Cartão" : String(row[2] ?? "").trim() || "Conta",
      plannedCents: parseMoneyCents(row[invoice ? 6 : 5]),
      paidCents: parseMoneyCents(row[invoice ? 7 : 6]),
      paidAt: parseBrazilianDate(row[invoice ? 8 : 7]),
      status, recurring: !invoice,
    });
  }
  return { records, warnings };
}

export function deduplicateEntries(entries: Expense[]): Expense[] {
  const seen = new Set<string>();
  return entries.filter((entry) => { if (seen.has(entry.id)) return false; seen.add(entry.id); return true; });
}
