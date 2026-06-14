import type { Transaction } from '../types';
import { merchantKey } from './normalize';

// Filtering & search applied to the normalised transaction list.

export interface Filters {
  search: string;
  category: string; // '' = all
  dateFrom: string; // ISO date or ''
  dateTo: string;
  minAmount: string; // absolute value, string for input binding
  maxAmount: string;
  recurringOnly: boolean;
  includeIncomplete: boolean;
}

export const EMPTY_FILTERS: Filters = {
  search: '',
  category: '',
  dateFrom: '',
  dateTo: '',
  minAmount: '',
  maxAmount: '',
  recurringOnly: false,
  includeIncomplete: false,
};

export function applyFilters(
  transactions: Transaction[],
  filters: Filters,
  recurringTxnIds: Set<string>,
): Transaction[] {
  const q = filters.search.trim().toLowerCase();
  const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;
  const min = filters.minAmount ? parseFloat(filters.minAmount) : null;
  const max = filters.maxAmount ? parseFloat(filters.maxAmount) : null;

  return transactions.filter((t) => {
    if (!filters.includeIncomplete && !t.completed) return false;
    if (filters.category && t.category !== filters.category) return false;
    if (filters.recurringOnly && !recurringTxnIds.has(t.id)) return false;
    if (q) {
      const hay = `${t.description} ${t.merchant} ${t.category} ${t.type}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (from && (!t.date || t.date < from)) return false;
    if (to && (!t.date || t.date > to)) return false;
    const abs = Math.abs(t.amount);
    if (min != null && abs < min) return false;
    if (max != null && abs > max) return false;
    return true;
  });
}

/** Distinct merchants for autocomplete-ish search hints. */
export function merchantOptions(transactions: Transaction[]): string[] {
  const seen = new Map<string, string>();
  for (const t of transactions) {
    const k = merchantKey(t.merchant);
    if (!seen.has(k)) seen.set(k, t.merchant);
  }
  return [...seen.values()].sort();
}
