import type { ColumnMapping, FieldKey } from '../types';

// Dynamic column detection. We never hardcode exact Revolut headers; instead we
// score each header against a set of synonyms per logical field and pick the
// best match. The user can override the result in the UI.

const SYNONYMS: Record<FieldKey, string[]> = {
  type: ['type', 'transaction type', 'txn type'],
  product: ['product', 'account', 'wallet'],
  startedDate: ['started date', 'start date', 'started', 'date started', 'initiated'],
  completedDate: [
    'completed date', 'completion date', 'completed', 'date completed',
    'date', 'transaction date', 'booking date', 'value date', 'posted',
  ],
  description: [
    'description', 'desc', 'details', 'reference', 'merchant', 'name',
    'counterparty', 'narrative', 'memo', 'payee',
  ],
  amount: ['amount', 'value', 'paid out', 'paid in', 'debit', 'credit', 'money'],
  fee: ['fee', 'fees', 'charge', 'commission'],
  currency: ['currency', 'ccy', 'curr'],
  state: ['state', 'status'],
  balance: ['balance', 'running balance', 'bal'],
};

/** Field order matters: assign the most specific fields first. */
const FIELD_ORDER: FieldKey[] = [
  'completedDate',
  'startedDate',
  'amount',
  'fee',
  'currency',
  'state',
  'type',
  'product',
  'balance',
  'description',
];

function norm(s: string): string {
  return s.toLowerCase().replace(/[_\-./]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreHeader(header: string, synonyms: string[]): number {
  const h = norm(header);
  let best = 0;
  for (const syn of synonyms) {
    if (h === syn) best = Math.max(best, 100);
    else if (h.startsWith(syn) || h.endsWith(syn)) best = Math.max(best, 80);
    else if (h.includes(syn)) best = Math.max(best, 60);
  }
  return best;
}

/**
 * Detect a column mapping from a list of header names. Greedy: each header is
 * assigned to at most one field, strongest field-match first.
 */
export function detectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    type: null, product: null, startedDate: null, completedDate: null,
    description: null, amount: null, fee: null, currency: null,
    state: null, balance: null,
  };
  const used = new Set<string>();

  // Build all (field, header, score) candidates, then assign greedily by score.
  const candidates: { field: FieldKey; header: string; score: number }[] = [];
  for (const field of FIELD_ORDER) {
    for (const header of headers) {
      const score = scoreHeader(header, SYNONYMS[field]);
      if (score > 0) candidates.push({ field, header, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  for (const c of candidates) {
    if (mapping[c.field]) continue; // field already filled
    if (used.has(c.header)) continue; // header already taken
    mapping[c.field] = c.header;
    used.add(c.header);
  }

  // Fee shares the word "fee" with nothing else; if amount wasn't found but a
  // numeric-looking header remains, leave it — the user can correct it.
  return mapping;
}

export const FIELD_LABELS: Record<FieldKey, string> = {
  type: 'Type',
  product: 'Product / Account',
  startedDate: 'Started date',
  completedDate: 'Completed date',
  description: 'Description',
  amount: 'Amount',
  fee: 'Fee',
  currency: 'Currency',
  state: 'State',
  balance: 'Balance',
};

/** Fields the app cannot work without. */
export const REQUIRED_FIELDS: FieldKey[] = ['amount', 'description'];
