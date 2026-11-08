const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseBrazilianDate(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (ISO_RE.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day ? value : null;
  }
  const match = DATE_RE.exec(value);
  if (!match) return null;
  const day = Number(match[1]); const month = Number(match[2]); const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day) return null;
  return [String(year).padStart(4, "0"), String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
}

export function parseMoneyCents(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input * 100) : null;
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed || /^[-–]$/.test(trimmed)) return null;
  const negative = trimmed.startsWith("-") || /^\(.*\)$/.test(trimmed);
  const cleaned = trimmed.replace(/[R$\s()\-]/g, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned.replace(/\./g, "").replace(",", ".")) * 100);
  return Number.isSafeInteger(cents) ? (negative ? -cents : cents) : null;
}
export const formatMoney = (cents: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
export function formatDate(value: string): string {
  const iso = parseBrazilianDate(value);
  if (!iso) return "Data inválida";
  const [year, month, day] = iso.split("-");
  return day + "/" + month + "/" + year;
}
