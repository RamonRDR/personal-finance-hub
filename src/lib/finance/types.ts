export type LedgerSource = "direct" | "card-oneoff" | "card-installment" | "external";
export interface Expense {
  id: string;
  date: string;
  description: string;
  category: string;
  payer: string | null;
  method: string | null;
  account: string | null;
  amountCents: number;
  source: LedgerSource;
  /** Optional source metadata for installment recognition; never a write target. */
  purchaseDate?: string | null;
  dueDate?: string | null;
  installmentLabel?: string | null;
}
export type PaymentStatus = "pending" | "paid" | "cancelled";
export interface Bill {
  id: string;
  dueDate: string;
  description: string;
  category: string;
  plannedCents: number | null;
  paidCents: number | null;
  paidAt: string | null;
  status: PaymentStatus;
  recurring: boolean;
}
export interface Budget {
  category: string;
  limitCents: number;
}
export interface ImportWarning {
  tab: string;
  row: number;
  code:
    | "invalid-date"
    | "invalid-due-date"
    | "invalid-paid-date"
    | "invalid-status"
    | "invalid-money"
    | "missing-description"
    | "duplicate"
    | "possible-duplicate"
    | "missing-tab"
    | "invalid-header";
}
export interface ImportResult<T> {
  records: T[];
  warnings: ImportWarning[];
}
export interface Snapshot {
  expenses: Expense[];
  bills: Bill[];
  budgets: Budget[];
  lastSyncedAt: string | null;
  mode: "demo" | "google-read-only";
}
