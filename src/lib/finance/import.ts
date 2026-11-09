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

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function isSubtotal(description: string): boolean {
  return /^TOTAL(?: DO DIA)?(?:\b|[\s:•-])/iu.test(description);
}

function statusFromSheet(value: unknown): Bill["status"] | null {
  const text = String(value ?? "").trim().toLocaleLowerCase("pt-BR");
  if (/cancelad/.test(text)) return "cancelled";
  if (/\b(pag[oa]|quitad[oa]|liquidad[oa])\b/u.test(text)) return "paid";
  if (/pendente|abert[oa]|vencid[oa]|atrasad[oa]|a vencer|previst[oa]|parcial/.test(text))
    return "pending";
  return null;
}

export function importExpenses(tab: keyof typeof SHEETS, rows: unknown[][]): ImportResult<Expense> {
  const config = SHEETS[tab];
  const records: Expense[] = [];
  const warnings: ImportWarning[] = [];
  for (let index = config.header; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const direct = config.kind === "direct";
    const external = config.kind === "external";
    const installment = config.kind === "card-installment";
    const description = String(row[direct ? 1 : external ? 3 : 2] ?? "").trim();
    const rawValue = row[direct ? 6 : external ? 5 : 7];
    if (isSubtotal(description)) continue;
    if (!description && !hasValue(rawValue)) continue;

    const purchaseDate = parseBrazilianDate(row[0]);
    const dueDate = direct || external ? null : parseBrazilianDate(row[6]);
    // Installments belong to the due month, not all to their initial purchase month.
    // A one-off card purchase remains dated by its purchase date.
    const recognizedDate = installment ? dueDate : purchaseDate;
    if (!recognizedDate) {
      warnings.push({
        tab,
        row: index + 1,
        code: installment ? "invalid-due-date" : "invalid-date",
      });
      continue;
    }
    if (!description) {
      warnings.push({ tab, row: index + 1, code: "missing-description" });
      continue;
    }
    const amountCents = parseMoneyCents(rawValue);
    if (amountCents === null) {
      warnings.push({ tab, row: index + 1, code: "invalid-money" });
      continue;
    }
    // The source row is a transient READ identifier, never a durable write target.
    records.push({
      id: tab + ":" + (index + 1),
      date: recognizedDate,
      description,
      category: String(row[direct ? 2 : external ? 2 : 3] ?? "").trim() || "Sem categoria",
      payer: String(row[direct ? 3 : 4] ?? "").trim() || null,
      method: direct ? String(row[4] ?? "").trim() || null : null,
      account: direct
        ? String(row[5] ?? "").trim() || null
        : external
          ? null
          : String(row[1] ?? "").trim() || null,
      amountCents,
      source: config.kind as LedgerSource,
      ...(installment
        ? {
            purchaseDate,
            dueDate: recognizedDate,
            installmentLabel: String(row[5] ?? "").trim() || null,
          }
        : {}),
    });
  }
  return { records, warnings };
}

export function importBills(
  tab: "Contas Fixas e Vencimentos" | "Faturas dos Cartões",
  rows: unknown[][],
): ImportResult<Bill> {
  const records: Bill[] = [];
  const warnings: ImportWarning[] = [];
  const invoice = tab === "Faturas dos Cartões";
  for (let index = 6; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const description = String(row[1] ?? "").trim();
    const rawDate = row[invoice ? 2 : 3];
    const date = parseBrazilianDate(rawDate);
    if (!description && !hasValue(rawDate)) continue;
    if (!date) {
      warnings.push({ tab, row: index + 1, code: "invalid-date" });
      continue;
    }
    const status = statusFromSheet(row[invoice ? 9 : 8]);
    if (status === null) {
      // Unknown formula output must not silently be treated as an unpaid bill.
      warnings.push({ tab, row: index + 1, code: "invalid-status" });
      continue;
    }
    const plannedRaw = row[invoice ? 6 : 5];
    const paidRaw = row[invoice ? 7 : 6];
    const plannedCents = parseMoneyCents(plannedRaw);
    const paidCents = parseMoneyCents(paidRaw);
    if ((hasValue(plannedRaw) && plannedCents === null) ||
        (hasValue(paidRaw) && paidCents === null)) {
      warnings.push({ tab, row: index + 1, code: "invalid-money" });
      continue;
    }
    const rawPaidAt = row[invoice ? 8 : 7];
    const paidAt = parseBrazilianDate(rawPaidAt);
    if (hasValue(rawPaidAt) && !paidAt) {
      warnings.push({ tab, row: index + 1, code: "invalid-paid-date" });
    }
    records.push({
      id: tab + ":" + (index + 1),
      dueDate: date,
      description: description || "Conta sem descrição",
      category: invoice ? "Cartão" : String(row[2] ?? "").trim() || "Conta",
      plannedCents,
      paidCents,
      paidAt,
      status,
      recurring: !invoice,
    });
  }
  return { records, warnings };
}

// Exact source identity is safe to de-duplicate, but a semantic match is not.
// Two identical purchases can be legitimate; flag them for review without deleting.
export function deduplicateEntries(entries: Expense[]): Expense[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

function normalizedKey(value: string | null | undefined): string {
  return (value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function detectPotentialDuplicates(entries: readonly Expense[]): ImportWarning[] {
  const seen = new Map<string, string>();
  const warnings: ImportWarning[] = [];
  for (const entry of entries) {
    const key = [
      entry.source,
      entry.date,
      normalizedKey(entry.description),
      normalizedKey(entry.account),
      normalizedKey(entry.payer),
      normalizedKey(entry.installmentLabel),
      entry.amountCents,
    ].join("|");
    const previous = seen.get(key);
    if (!previous) {
      seen.set(key, entry.id);
      continue;
    }
    if (previous === entry.id) continue;
    const match = /^(.*):(\d+)$/.exec(entry.id);
    if (match) warnings.push({ tab: match[1], row: Number(match[2]), code: "possible-duplicate" });
  }
  return warnings;
}
