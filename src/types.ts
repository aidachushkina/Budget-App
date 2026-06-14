// Core domain types. Everything here lives only in the browser tab.

/** A raw parsed CSV row: header name -> cell value, as strings. */
export type RawRow = Record<string, string>;

/**
 * The logical fields we care about, mapped to the actual header names found
 * in the uploaded file. Revolut exports vary, so nothing is hardcoded — this
 * mapping is detected on upload and is user-correctable.
 */
export interface ColumnMapping {
  type: string | null;
  product: string | null;
  startedDate: string | null;
  completedDate: string | null;
  description: string | null;
  amount: string | null;
  fee: string | null;
  currency: string | null;
  state: string | null;
  balance: string | null;
}

export type FieldKey = keyof ColumnMapping;

/** A normalised transaction derived from one raw row. */
export interface Transaction {
  /** Stable id for this session (index-based, deterministic). */
  id: string;
  type: string;
  product: string;
  /** Best available date (completed preferred, else started). */
  date: Date | null;
  startedDate: Date | null;
  completedDate: Date | null;
  description: string;
  /** Cleaned merchant/counterparty name used for grouping. */
  merchant: string;
  /** Signed amount in the transaction's own currency. Negative = spend. */
  amount: number;
  /** Fee in the transaction's own currency (>= 0). */
  fee: number;
  currency: string;
  state: string;
  balance: number | null;
  /** True when State indicates the txn did not complete. */
  completed: boolean;
  /** Assigned spending category (editable). */
  category: string;
  /** Heuristically an internal transfer / top-up between own accounts/pots. */
  isTransfer: boolean;
  /**
   * Excluded from spend/income totals. Defaults to isTransfer but is an
   * independent, user-editable flag so re-tagging is possible.
   */
  excluded: boolean;
  /** The original row, kept for the preview and CSV export. */
  raw: RawRow;
}

export type Cadence = 'weekly' | 'monthly' | 'quarterly' | 'annual';

export interface RecurringGroup {
  key: string;
  merchant: string;
  category: string;
  cadence: Cadence;
  /** Median absolute amount per charge (in base currency). */
  typicalAmount: number;
  currency: string;
  occurrences: number;
  lastDate: Date;
  nextExpected: Date;
  /** Per-occurrence absolute amounts, oldest first (base currency). */
  amounts: number[];
  dates: Date[];
  /** Latest charge is meaningfully higher than the earlier typical amount. */
  priceIncreased: boolean;
  /** Annualised cost in base currency. */
  annualised: number;
  txnIds: string[];
}

/** Money totals for the dashboard, all in base currency. */
export interface Summary {
  income: number;
  spend: number;
  fees: number;
  net: number;
  savingsRate: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  byCategory: { category: string; amount: number; pct: number; count: number }[];
  topMerchants: { merchant: string; amount: number; count: number }[];
  recurringMonthly: number;
  recurringAnnual: number;
}
