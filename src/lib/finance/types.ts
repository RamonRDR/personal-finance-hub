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
    | "invalid-money"
    | "missing-description"
    | "duplicate"
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
