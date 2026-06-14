import type { Transaction } from '../types';

// Manual FX only. There is deliberately no network call to fetch rates — the
// user sets a simple rate per non-base currency so nothing leaves the device.

export type FxRates = Record<string, number>; // currency -> units of base per 1 unit

/** Convert a value in `currency` into the base currency using manual rates. */
export function toBase(
  value: number,
  currency: string,
  baseCurrency: string,
  rates: FxRates,
): number {
  if (!currency || currency === baseCurrency) return value;
  const rate = rates[currency];
  if (!rate || !isFinite(rate)) return value; // unknown rate: pass through 1:1
  return value * rate;
}

/** Distinct currencies present in the data, excluding the base. */
export function foreignCurrencies(
  transactions: Transaction[],
  baseCurrency: string,
): string[] {
  const set = new Set<string>();
  for (const t of transactions) {
    if (t.currency && t.currency !== baseCurrency) set.add(t.currency);
  }
  return [...set].sort();
}

/** The currency that appears most often — a sensible default base. */
export function dominantCurrency(transactions: Transaction[]): string {
  const counts = new Map<string, number>();
  for (const t of transactions) {
    const c = t.currency || 'GBP';
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  let best = 'GBP';
  let bestN = -1;
  for (const [c, n] of counts) {
    if (n > bestN) {
      best = c;
      bestN = n;
    }
  }
  return best;
}
