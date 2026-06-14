import { Download } from 'lucide-react';
import type { RecurringGroup, Summary } from '../types';
import { StatCard, SectionTitle, EmptyHint } from './ui';
import { CategoryDonut, MerchantBars } from './CategoryChart';
import { CategoryIcon } from './categoryIcon';
import { money, pct, shortDate } from '../lib/format';
import { exportSummary } from '../lib/exportCsv';

// The summary dashboard: headline cards, category breakdown (table + chart),
// top merchants, and recurring burden.

export function Dashboard({
  summary,
  recurring,
  baseCurrency,
}: {
  summary: Summary;
  recurring: RecurringGroup[];
  baseCurrency: string;
}) {
  if (summary.spend === 0 && summary.income === 0) {
    return <EmptyHint>No completed spend or income in the current data.</EmptyHint>;
  }

  const periodLabel =
    summary.periodStart && summary.periodEnd
      ? `${shortDate(summary.periodStart)} – ${shortDate(summary.periodEnd)}`
      : 'All data';

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Summary"
        description={`Period: ${periodLabel} · all amounts in ${baseCurrency}`}
        right={
          <button className="btn" onClick={() => exportSummary(summary, baseCurrency)}>
            <Download className="h-4 w-4" /> Export summary
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Income" value={money(summary.income, baseCurrency)} tone="income" />
        <StatCard label="Spend" value={money(summary.spend, baseCurrency)} tone="spend" />
        <StatCard
          label="Net"
          value={money(summary.net, baseCurrency)}
          tone={summary.net >= 0 ? 'income' : 'spend'}
          sub={`Fees: ${money(summary.fees, baseCurrency)}`}
        />
        <StatCard
          label="Savings rate"
          value={pct(summary.savingsRate)}
          sub={summary.income > 0 ? 'of income kept' : 'no income in period'}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <StatCard
          label="Recurring per month"
          value={money(summary.recurringMonthly, baseCurrency)}
          sub={`${recurring.length} recurring charges detected`}
        />
        <StatCard
          label="Recurring annualised"
          value={money(summary.recurringAnnual, baseCurrency)}
          sub="If every subscription continues for a year"
        />
      </div>

      {/* Category breakdown: table + donut */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <SectionTitle title="Spend by category" />
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="th">Category</th>
                  <th className="th text-right">Amount</th>
                  <th className="th text-right">% of spend</th>
                  <th className="th text-right">Txns</th>
                </tr>
              </thead>
              <tbody>
                {summary.byCategory.map((c) => (
                  <tr key={c.category} className="border-b border-line/60 last:border-0">
                    <td className="td">
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <CategoryIcon category={c.category} className="h-4 w-4 text-ink-faint" />
                        {c.category}
                      </span>
                    </td>
                    <td className="td text-right nums">{money(c.amount, baseCurrency)}</td>
                    <td className="td text-right nums text-ink-faint">{pct(c.pct)}</td>
                    <td className="td text-right nums text-ink-faint">{c.count}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line">
                  <td className="td font-semibold text-ink">Total</td>
                  <td className="td text-right font-semibold nums text-ink">
                    {money(summary.spend, baseCurrency)}
                  </td>
                  <td className="td" />
                  <td className="td" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div className="card lg:col-span-2">
          <SectionTitle title="Distribution" />
          <CategoryDonut data={summary.byCategory} baseCurrency={baseCurrency} />
        </div>
      </div>

      {/* Top merchants */}
      <div className="card">
        <SectionTitle title="Top 10 merchants by spend" />
        <MerchantBars data={summary.topMerchants} baseCurrency={baseCurrency} />
      </div>
    </div>
  );
}
