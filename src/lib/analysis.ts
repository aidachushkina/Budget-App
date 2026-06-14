import type { RecurringGroup, Summary, Transaction } from '../types';
import { merchantKey } from './normalize';
import { toBase, type FxRates } from './fx';
import { DISCRETIONARY_CATEGORIES, ESSENTIAL_CATEGORIES } from './categories';

// Dashboard summary + the transparent "could be cut" rules. None of this is
// advice; every flag is rule-based and explained in the UI.

export interface SummaryOptions {
  baseCurrency: string;
  rates: FxRates;
  recurring: RecurringGroup[];
}

/** Build the headline dashboard summary, all in base currency. */
export function buildSummary(
  transactions: Transaction[],
  opts: SummaryOptions,
): Summary {
  const { baseCurrency, rates } = opts;
  let income = 0;
  let spend = 0;
  let fees = 0;
  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;

  const catTotals = new Map<string, { amount: number; count: number }>();
  const merchTotals = new Map<string, { merchant: string; amount: number; count: number }>();

  for (const t of transactions) {
    if (!t.completed) continue;
    if (t.date) {
      if (!periodStart || t.date < periodStart) periodStart = t.date;
      if (!periodEnd || t.date > periodEnd) periodEnd = t.date;
    }
    const feeBase = toBase(t.fee, t.currency, baseCurrency, rates);
    fees += feeBase;

    if (t.excluded) continue; // transfers/top-ups don't count as spend/income

    const amt = toBase(t.amount, t.currency, baseCurrency, rates);
    if (amt > 0) {
      income += amt;
    } else if (amt < 0) {
      const abs = -amt;
      spend += abs;
      const cat = catTotals.get(t.category) ?? { amount: 0, count: 0 };
      cat.amount += abs;
      cat.count += 1;
      catTotals.set(t.category, cat);

      const mk = merchantKey(t.merchant);
      const m = merchTotals.get(mk) ?? { merchant: t.merchant, amount: 0, count: 0 };
      m.amount += abs;
      m.count += 1;
      merchTotals.set(mk, m);
    }
  }

  const byCategory = [...catTotals.entries()]
    .map(([category, v]) => ({
      category,
      amount: v.amount,
      count: v.count,
      pct: spend > 0 ? (v.amount / spend) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const topMerchants = [...merchTotals.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const recurringMonthly = opts.recurring.reduce(
    (sum, r) => sum + r.annualised / 12,
    0,
  );

  const net = income - spend;
  return {
    income,
    spend,
    fees,
    net,
    savingsRate: income > 0 ? (net / income) * 100 : 0,
    periodStart,
    periodEnd,
    byCategory,
    topMerchants,
    recurringMonthly,
    recurringAnnual: recurringMonthly * 12,
  };
}

export interface DiscretionarySplit {
  essential: number;
  discretionary: number;
  other: number;
}

/** Split spend into essential vs discretionary vs other (base currency). */
export function splitDiscretionary(
  transactions: Transaction[],
  baseCurrency: string,
  rates: FxRates,
): DiscretionarySplit {
  let essential = 0;
  let discretionary = 0;
  let other = 0;
  for (const t of transactions) {
    if (!t.completed || t.excluded) continue;
    const amt = toBase(t.amount, t.currency, baseCurrency, rates);
    if (amt >= 0) continue;
    const abs = -amt;
    if (ESSENTIAL_CATEGORIES.has(t.category)) essential += abs;
    else if (DISCRETIONARY_CATEGORIES.has(t.category)) discretionary += abs;
    else other += abs;
  }
  return { essential, discretionary, other };
}

// ---- "Could be cut" flags ---------------------------------------------------

export interface CutFlag {
  kind: 'duplicate' | 'price-increase' | 'small-frequent' | 'top-recurring';
  title: string;
  detail: string;
  monthly: number;
  annual: number;
  txnIds: string[];
}

/**
 * Streaming/cloud service families used to spot overlapping subscriptions.
 * Transparent and editable in spirit: simple keyword groups.
 */
const OVERLAP_GROUPS: { label: string; keywords: string[] }[] = [
  {
    label: 'Video streaming',
    keywords: ['netflix', 'disney', 'prime video', 'now tv', 'nowtv', 'paramount', 'hbo', 'hulu', 'apple tv', 'sky'],
  },
  {
    label: 'Music streaming',
    keywords: ['spotify', 'apple music', 'youtube music', 'tidal', 'deezer', 'amazon music'],
  },
  {
    label: 'Cloud storage',
    keywords: ['icloud', 'google one', 'google storage', 'dropbox', 'onedrive', 'box.com'],
  },
];

export interface CutOptions {
  baseCurrency: string;
  rates: FxRates;
  recurring: RecurringGroup[];
  /** Threshold (count) for "small frequent" spends in the period. */
  smallFrequentMinCount?: number;
  /** Upper bound for what counts as a "small" charge, base currency. */
  smallFrequentMaxAmount?: number;
}

/** Produce the transparent, reviewable could-be-cut flags. */
export function buildCutFlags(
  transactions: Transaction[],
  opts: CutOptions,
): CutFlag[] {
  const flags: CutFlag[] = [];
  const { recurring } = opts;

  // 1. Top recurring by annualised cost (surface the 5 biggest).
  for (const r of recurring.slice(0, 5)) {
    flags.push({
      kind: 'top-recurring',
      title: `${r.merchant} · ${r.cadence}`,
      detail: `Recurring ${r.cadence} charge of ${fmt(r.typicalAmount)} — ${r.occurrences} seen.`,
      monthly: r.annualised / 12,
      annual: r.annualised,
      txnIds: r.txnIds,
    });
  }

  // 2. Overlapping / duplicate subscriptions within a service family.
  for (const group of OVERLAP_GROUPS) {
    const matches = recurring.filter((r) =>
      group.keywords.some((k) => r.merchant.toLowerCase().includes(k)),
    );
    if (matches.length >= 2) {
      const annual = matches.reduce((s, r) => s + r.annualised, 0);
      flags.push({
        kind: 'duplicate',
        title: `Multiple ${group.label} subscriptions`,
        detail: `${matches.map((m) => m.merchant).join(', ')} — overlapping services you may not need at once.`,
        monthly: annual / 12,
        annual,
        txnIds: matches.flatMap((m) => m.txnIds),
      });
    }
  }

  // 3. Price creep on recurring charges.
  for (const r of recurring) {
    if (!r.priceIncreased) continue;
    const first = r.amounts[0];
    const latest = r.amounts[r.amounts.length - 1];
    flags.push({
      kind: 'price-increase',
      title: `${r.merchant} price increased`,
      detail: `Latest charge ${fmt(latest)} vs earlier ~${fmt(first)} (+${fmt(latest - first)}).`,
      monthly: (latest - first) * (r.cadence === 'monthly' ? 1 : r.cadence === 'weekly' ? 4.33 : r.cadence === 'quarterly' ? 1 / 3 : 1 / 12),
      annual: (latest - r.amounts[0]) * (r.cadence === 'weekly' ? 52 : r.cadence === 'monthly' ? 12 : r.cadence === 'quarterly' ? 4 : 1),
      txnIds: r.txnIds,
    });
  }

  // 4. Small frequent spends that add up (e.g. coffee, delivery fees).
  const minCount = opts.smallFrequentMinCount ?? 5;
  const maxAmt = opts.smallFrequentMaxAmount ?? 15;
  const byMerchant = new Map<string, { merchant: string; total: number; count: number; ids: string[]; first: Date | null; last: Date | null }>();
  for (const t of transactions) {
    if (!t.completed || t.excluded) continue;
    const amt = toBase(t.amount, t.currency, opts.baseCurrency, opts.rates);
    if (amt >= 0) continue;
    const abs = -amt;
    if (abs > maxAmt) continue;
    const mk = merchantKey(t.merchant);
    const e = byMerchant.get(mk) ?? { merchant: t.merchant, total: 0, count: 0, ids: [], first: null, last: null };
    e.total += abs;
    e.count += 1;
    e.ids.push(t.id);
    if (t.date) {
      if (!e.first || t.date < e.first) e.first = t.date;
      if (!e.last || t.date > e.last) e.last = t.date;
    }
    byMerchant.set(mk, e);
  }
  for (const e of byMerchant.values()) {
    if (e.count < minCount) continue;
    const months = monthsBetween(e.first, e.last);
    const monthly = e.total / months;
    flags.push({
      kind: 'small-frequent',
      title: `Frequent small spends at ${e.merchant}`,
      detail: `${e.count} charges averaging ${fmt(e.total / e.count)} each — ${fmt(e.total)} total.`,
      monthly,
      annual: monthly * 12,
      txnIds: e.ids,
    });
  }

  // Biggest opportunities first.
  flags.sort((a, b) => b.annual - a.annual);
  return flags;
}

function monthsBetween(a: Date | null, b: Date | null): number {
  if (!a || !b) return 1;
  const days = Math.abs(b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000);
  return Math.max(1, days / 30.44);
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
