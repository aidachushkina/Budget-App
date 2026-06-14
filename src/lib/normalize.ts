import type { ColumnMapping, RawRow, Transaction } from '../types';

// Convert raw CSV rows into normalised Transaction objects using the mapping.

/** Parse a money string like "-1,234.56", "1.234,56", "(12.30)" or "£5". */
export function parseAmount(value: string | undefined): number {
  if (value == null) return 0;
  let s = String(value).trim();
  if (!s) return 0;

  // Accounting negatives: (12.30) -> -12.30
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.includes('-')) negative = true;

  // Strip currency symbols / codes / spaces, keep digits and separators.
  s = s.replace(/[^0-9.,]/g, '');
  if (!s) return 0;

  // Decide decimal separator. If both present, the last one is the decimal.
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      // European: 1.234,56
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Anglo: 1,234.56
      s = s.replace(/,/g, '');
    }
  } else if (lastComma > -1) {
    // Only commas. Treat as decimal if it looks like one (e.g. 12,30).
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 2) s = parts.join('.');
    else s = s.replace(/,/g, '');
  }
  // Only dots, or no separators: parseFloat handles it.

  const n = parseFloat(s);
  if (!isFinite(n)) return 0;
  return negative ? -Math.abs(n) : n;
}

/** Best-effort date parsing for the formats Revolut and others emit. */
export function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  // ISO-ish: 2024-03-15 or 2024-03-15 14:23:01 (optionally with T)
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    return new Date(
      +m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0),
    );
  }
  // DD/MM/YYYY or DD-MM-YYYY (assume day-first, common outside the US)
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    const year = y.length === 2 ? 2000 + +y : +y;
    let day = +d;
    let month = +mo;
    // If first part clearly can't be a day, swap (US format fallback).
    if (day > 12 && month <= 12) {
      /* already day-first */
    } else if (month > 12 && day <= 12) {
      [day, month] = [month, day];
    }
    return new Date(year, month - 1, day);
  }
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/** Heuristic: does a State value indicate a completed transaction? */
export function isCompletedState(state: string): boolean {
  if (!state) return true; // no state column -> assume completed
  const s = state.toLowerCase();
  if (/(revert|declin|cancel|fail|pending|reject)/.test(s)) return false;
  return /complet|done|success|settl|posted|ok/.test(s) || s === '';
}

/** Clean a description into a merchant key for grouping. */
export function cleanMerchant(description: string): string {
  let s = (description || '').trim();
  if (!s) return 'Unknown';
  // Drop common transaction prefixes.
  s = s.replace(
    /^(card payment to|payment to|payment from|to |from |transfer to|transfer from|direct debit|standing order|top-?up by|exchanged to)\s*/i,
    '',
  );
  // Strip trailing reference noise: long digit runs, dates, card masks.
  s = s.replace(/\b\d{4,}\b/g, ' ');
  s = s.replace(/\*+\d+/g, ' ');
  s = s.replace(/\s{2,}/g, ' ').trim();
  // Title-case-ish but keep existing casing if it has lowercase already.
  return s || description.trim();
}

/** A normalised key used to group the same merchant across rows. */
export function merchantKey(merchant: string): string {
  return merchant.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 40);
}

const TRANSFER_TYPE = /(transfer|topup|top-up|top up|exchange|to pocket|vault)/i;
const TRANSFER_DESC =
  /(to .*pocket|to .*vault|to .*savings|own account|between accounts|top-?up|added money|moved to|to revolut|from revolut|to .*pot|from .*pot)/i;

/** Heuristic: is this an internal transfer / top-up between own accounts? */
export function looksLikeTransfer(type: string, description: string): boolean {
  return TRANSFER_TYPE.test(type || '') || TRANSFER_DESC.test(description || '');
}

export interface NormalizeResult {
  transactions: Transaction[];
  skippedIncomplete: number;
}

/** Build Transaction objects from raw rows given a column mapping. */
export function normalize(
  rows: RawRow[],
  mapping: ColumnMapping,
): NormalizeResult {
  const transactions: Transaction[] = [];
  let skippedIncomplete = 0;

  rows.forEach((raw, i) => {
    const get = (key: keyof ColumnMapping): string => {
      const col = mapping[key];
      return col ? (raw[col] ?? '') : '';
    };

    const description = get('description') || get('type') || 'Unknown';
    const amount = parseAmount(get('amount'));
    const fee = Math.abs(parseAmount(get('fee')));
    const state = get('state');
    const completed = isCompletedState(state);

    // Skip rows that are entirely empty (trailing CSV lines).
    if (!description.trim() && amount === 0 && !get('amount')) return;

    if (!completed) {
      skippedIncomplete++;
      // Still keep it so the preview can show it, but flag as not completed.
    }

    const type = get('type');
    const merchant = cleanMerchant(description);
    const isTransfer = looksLikeTransfer(type, description);
    const startedDate = parseDate(get('startedDate'));
    const completedDate = parseDate(get('completedDate'));
    const balanceStr = get('balance');

    transactions.push({
      id: `t${i}`,
      type,
      product: get('product'),
      date: completedDate ?? startedDate,
      startedDate,
      completedDate,
      description,
      merchant,
      amount,
      fee,
      currency: (get('currency') || '').toUpperCase() || 'GBP',
      state,
      balance: balanceStr ? parseAmount(balanceStr) : null,
      completed,
      category: '', // assigned later by categorize()
      isTransfer,
      excluded: isTransfer,
      raw,
    });
  });

  return { transactions, skippedIncomplete };
}
