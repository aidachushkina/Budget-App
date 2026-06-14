import type { Transaction } from '../types';
import type { KeywordRule } from './categories';

// Auto-categorisation using ordered keyword rules. Pure and transparent: the
// same input always yields the same category, and every rule is visible/editable.

/**
 * Whether `keyword` appears in `hay` respecting word boundaries, so e.g. the
 * keyword "tfl" does NOT match inside "ne-tfl-ix". A boundary is only required
 * on a side where the keyword itself starts/ends with an alphanumeric char,
 * which keeps keywords containing punctuation/spaces (e.g. "apple.com/bill")
 * working as plain substrings.
 */
export function keywordMatches(hay: string, keyword: string): boolean {
  const k = keyword.toLowerCase();
  if (!k) return false;
  let from = 0;
  const isWord = (c: string | undefined) => !!c && /[a-z0-9]/.test(c);
  const startsWord = /[a-z0-9]/.test(k[0]);
  const endsWord = /[a-z0-9]/.test(k[k.length - 1]);
  for (;;) {
    const idx = hay.indexOf(k, from);
    if (idx === -1) return false;
    const before = hay[idx - 1];
    const after = hay[idx + k.length];
    const okBefore = !startsWord || !isWord(before);
    const okAfter = !endsWord || !isWord(after);
    if (okBefore && okAfter) return true;
    from = idx + 1;
  }
}

/**
 * Choose a category for a transaction. Precedence:
 *  1. Excluded / transfer -> "Transfers"
 *  2. Positive amount with no spend context -> "Income"
 *  3. Fee-only rows -> "Fees"
 *  4. First matching keyword rule (by merchant/description)
 *  5. "Other"
 */
export function categorizeOne(
  txn: Transaction,
  rules: KeywordRule[],
): string {
  if (txn.isTransfer) return 'Transfers';

  const hay = `${txn.description} ${txn.merchant} ${txn.type}`.toLowerCase();

  // Keyword rules take priority so a known merchant always wins, even for refunds.
  for (const rule of rules) {
    if (rule.keyword && keywordMatches(hay, rule.keyword)) {
      return rule.category;
    }
  }

  if (txn.amount > 0) return 'Income';
  if (txn.amount === 0 && txn.fee > 0) return 'Fees';
  return 'Other';
}

/** Assign categories to a list of transactions (non-mutating). */
export function categorizeAll(
  transactions: Transaction[],
  rules: KeywordRule[],
): Transaction[] {
  return transactions.map((t) => ({
    ...t,
    category: t.category || categorizeOne(t, rules),
  }));
}
