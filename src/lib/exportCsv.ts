import Papa from 'papaparse';
import type { Summary, Transaction } from '../types';
import { toBase, type FxRates } from './fx';

// CSV export of the categorised data and the summary. Generated and downloaded
// entirely in-browser via a Blob; nothing is transmitted.

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '';
}

/** Export the categorised transactions with derived fields. */
export function exportTransactions(
  transactions: Transaction[],
  baseCurrency: string,
  rates: FxRates,
) {
  const rows = transactions.map((t) => ({
    Date: fmtDate(t.date),
    Description: t.description,
    Merchant: t.merchant,
    Type: t.type,
    Category: t.category,
    Amount: t.amount,
    Fee: t.fee,
    Currency: t.currency,
    [`Amount (${baseCurrency})`]: round(toBase(t.amount, t.currency, baseCurrency, rates)),
    State: t.state,
    Completed: t.completed ? 'yes' : 'no',
    'Excluded from totals': t.excluded ? 'yes' : 'no',
    Recurring: '', // filled by caller if desired
  }));
  download(`budget-transactions-${stamp()}.csv`, Papa.unparse(rows));
}

/** Export the headline summary and category breakdown. */
export function exportSummary(summary: Summary, baseCurrency: string) {
  const lines: Record<string, string | number>[] = [
    { Metric: 'Base currency', Value: baseCurrency },
    { Metric: 'Period start', Value: fmtDate(summary.periodStart) },
    { Metric: 'Period end', Value: fmtDate(summary.periodEnd) },
    { Metric: 'Total income', Value: round(summary.income) },
    { Metric: 'Total spend', Value: round(summary.spend) },
    { Metric: 'Net', Value: round(summary.net) },
    { Metric: 'Savings rate %', Value: round(summary.savingsRate) },
    { Metric: 'Fees', Value: round(summary.fees) },
    { Metric: 'Recurring per month', Value: round(summary.recurringMonthly) },
    { Metric: 'Recurring annualised', Value: round(summary.recurringAnnual) },
    {},
    { Metric: 'Category', Value: 'Amount / % / count' },
    ...summary.byCategory.map((c) => ({
      Metric: c.category,
      Value: `${round(c.amount)} / ${round(c.pct)}% / ${c.count}`,
    })),
    {},
    { Metric: 'Top merchant', Value: 'Amount / count' },
    ...summary.topMerchants.map((m) => ({
      Metric: m.merchant,
      Value: `${round(m.amount)} / ${m.count}`,
    })),
  ];
  download(`budget-summary-${stamp()}.csv`, Papa.unparse(lines));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}
