// Smoke test of the pure analysis pipeline against the synthetic sample.
// Run: node scripts/smoke.mjs  (Node 22 strips TS types natively)
import Papa from 'papaparse';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectMapping } from '../src/lib/mapping.ts';
import { normalize } from '../src/lib/normalize.ts';
import { categorizeOne } from '../src/lib/categorize.ts';
import { DEFAULT_RULES } from '../src/lib/categories.ts';
import { detectRecurring } from '../src/lib/recurring.ts';
import { buildSummary, buildCutFlags } from '../src/lib/analysis.ts';

const root = process.env.SMOKE_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), '..');
const csv = readFileSync(resolve(root, 'public/sample-revolut.csv'), 'utf8');
const parsed = Papa.parse(csv.trim(), { header: true, skipEmptyLines: true });
const headers = parsed.meta.fields;
const rows = parsed.data;

const mapping = detectMapping(headers);
console.log('Mapping:', mapping);

const { transactions, skippedIncomplete } = normalize(rows, mapping);
const cat = transactions.map((t) => ({ ...t, category: categorizeOne(t, DEFAULT_RULES) }));

const baseCurrency = 'GBP';
const rates = { EUR: 0.86 };
const recurring = detectRecurring(cat, { baseCurrency, rates });
const summary = buildSummary(cat, { baseCurrency, rates, recurring });
const flags = buildCutFlags(cat, { baseCurrency, rates, recurring });

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok  :', msg);
  }
};

console.log('\n--- counts ---');
console.log('transactions:', transactions.length, 'incomplete:', skippedIncomplete);
assert(mapping.amount === 'Amount', 'amount column detected');
assert(mapping.completedDate === 'Completed Date', 'completed date detected');
assert(mapping.description === 'Description', 'description detected');

console.log('\n--- categories ---');
const byCat = {};
for (const t of cat) byCat[t.category] = (byCat[t.category] || 0) + 1;
console.log(byCat);
assert(cat.some((t) => t.merchant.includes('Netflix') && t.category === 'Subscriptions'), 'Netflix -> Subscriptions');
assert(cat.some((t) => t.merchant.includes('Tesco') && t.category === 'Groceries'), 'Tesco -> Groceries');
assert(cat.some((t) => t.isTransfer && t.category === 'Transfers'), 'Pocket transfer -> Transfers/excluded');

console.log('\n--- recurring ---');
for (const r of recurring) {
  console.log(`${r.merchant.padEnd(20)} ${r.cadence.padEnd(9)} typ=${r.typicalAmount.toFixed(2)} x${r.occurrences} annual=${r.annualised.toFixed(0)} ${r.priceIncreased ? 'PRICE-UP' : ''}`);
}
assert(recurring.some((r) => r.merchant.includes('Netflix')), 'Netflix detected recurring');
assert(recurring.some((r) => r.merchant.includes('Netflix') && r.priceIncreased), 'Netflix price increase flagged');
assert(recurring.some((r) => r.cadence === 'monthly'), 'monthly cadence found');

console.log('\n--- summary ---');
console.log('income', summary.income.toFixed(2), 'spend', summary.spend.toFixed(2), 'net', summary.net.toFixed(2), 'savings%', summary.savingsRate.toFixed(1));
console.log('recurring/mo', summary.recurringMonthly.toFixed(2), 'top merchant', summary.topMerchants[0]?.merchant);
assert(summary.income > 7000, 'income ~ 3x salary');
assert(summary.spend > 0 && summary.spend < summary.income, 'spend positive and below income');
assert(summary.byCategory.length > 3, 'multiple spend categories');

console.log('\n--- cut flags ---');
for (const f of flags) console.log(`[${f.kind}] ${f.title} — ${f.annual.toFixed(0)}/yr`);
assert(flags.some((f) => f.kind === 'duplicate'), 'overlapping streaming/cloud flagged');
assert(flags.some((f) => f.kind === 'price-increase'), 'price increase flagged');
assert(flags.some((f) => f.kind === 'small-frequent'), 'coffee small-frequent flagged');

console.log('\nDone.');
