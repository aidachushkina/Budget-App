import type { Cadence, RecurringGroup, Transaction } from '../types';
import { merchantKey } from './normalize';
import { toBase, type FxRates } from './fx';

// Recurring payment detection. We group spend by merchant, then look for a
// regular cadence (weekly / monthly / quarterly / annual) with similar amounts.

const DAY = 24 * 60 * 60 * 1000;

interface CadenceSpec {
  cadence: Cadence;
  days: number;
  perYear: number;
  tolerance: number; // +/- days allowed around the nominal interval
}

const CADENCES: CadenceSpec[] = [
  { cadence: 'weekly', days: 7, perYear: 52, tolerance: 2 },
  { cadence: 'monthly', days: 30.44, perYear: 12, tolerance: 6 },
  { cadence: 'quarterly', days: 91.31, perYear: 4, tolerance: 12 },
  { cadence: 'annual', days: 365.25, perYear: 1, tolerance: 21 },
];

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Pick the cadence whose interval best matches the median gap between charges. */
function classifyCadence(gapsDays: number[]): CadenceSpec | null {
  if (!gapsDays.length) return null;
  const medGap = median(gapsDays);
  let best: CadenceSpec | null = null;
  let bestErr = Infinity;
  for (const spec of CADENCES) {
    const err = Math.abs(medGap - spec.days);
    if (err <= spec.tolerance && err < bestErr) {
      best = spec;
      bestErr = err;
    }
  }
  return best;
}

export interface RecurringOptions {
  baseCurrency: string;
  rates: FxRates;
  /** Minimum number of charges to consider something recurring. */
  minOccurrences?: number;
}

/**
 * Detect recurring groups among spend transactions. Income, transfers and
 * excluded rows are ignored. Amounts are compared in base currency.
 */
export function detectRecurring(
  transactions: Transaction[],
  opts: RecurringOptions,
): RecurringGroup[] {
  const minOcc = opts.minOccurrences ?? 3;
  const groups = new Map<string, Transaction[]>();

  for (const t of transactions) {
    if (t.excluded || !t.completed) continue;
    if (t.amount >= 0) continue; // only outgoing charges recur here
    if (!t.date) continue;
    const key = merchantKey(t.merchant);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const result: RecurringGroup[] = [];

  for (const [key, txns] of groups) {
    if (txns.length < minOcc) continue;
    const sorted = [...txns].sort(
      (a, b) => (a.date!.getTime() - b.date!.getTime()),
    );

    // Gaps between consecutive charges, in days.
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((sorted[i].date!.getTime() - sorted[i - 1].date!.getTime()) / DAY);
    }
    const spec = classifyCadence(gaps);
    if (!spec) continue;

    // Amount consistency: charges should cluster around a typical value.
    const absAmounts = sorted.map((t) =>
      Math.abs(toBase(t.amount, t.currency, opts.baseCurrency, opts.rates)),
    );
    const typical = median(absAmounts);
    if (typical <= 0) continue;
    const within = absAmounts.filter(
      (a) => Math.abs(a - typical) <= Math.max(typical * 0.35, 1.5),
    ).length;
    // Require most charges to be near the typical amount.
    if (within / absAmounts.length < 0.6) continue;

    const last = sorted[sorted.length - 1];
    const lastDate = last.date!;
    const nextExpected = new Date(lastDate.getTime() + spec.days * DAY);

    // Price creep: latest charge meaningfully above the earlier typical amount.
    const earlier = absAmounts.slice(0, -1);
    const earlierTypical = earlier.length ? median(earlier) : typical;
    const latest = absAmounts[absAmounts.length - 1];
    const priceIncreased =
      earlier.length >= 2 && latest > earlierTypical * 1.1 + 0.01;

    result.push({
      key,
      merchant: last.merchant,
      category: last.category,
      cadence: spec.cadence,
      typicalAmount: typical,
      currency: opts.baseCurrency,
      occurrences: sorted.length,
      lastDate,
      nextExpected,
      amounts: absAmounts,
      dates: sorted.map((t) => t.date!),
      priceIncreased,
      annualised: typical * spec.perYear,
      txnIds: sorted.map((t) => t.id),
    });
  }

  result.sort((a, b) => b.annualised - a.annualised);
  return result;
}
