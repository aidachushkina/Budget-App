import { Repeat, TrendingUp, CalendarClock } from 'lucide-react';
import type { RecurringGroup } from '../types';
import { SectionTitle, EmptyHint, Badge } from './ui';
import { CategoryIcon } from './categoryIcon';
import { money, shortDate } from '../lib/format';

// Dedicated "Subscriptions & recurring" view.

const CADENCE_LABEL: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

export function RecurringView({
  recurring,
  baseCurrency,
}: {
  recurring: RecurringGroup[];
  baseCurrency: string;
}) {
  if (!recurring.length) {
    return (
      <EmptyHint>
        No recurring charges detected yet. We look for merchants billed on a regular
        cadence (weekly, monthly, quarterly, annual) with similar amounts at least 3
        times. A longer statement gives better detection.
      </EmptyHint>
    );
  }

  const monthly = recurring.reduce((s, r) => s + r.annualised / 12, 0);
  const annual = monthly * 12;

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Subscriptions & recurring"
        description={`Detected ${recurring.length} recurring charges · ${money(
          monthly,
          baseCurrency,
        )}/mo · ${money(annual, baseCurrency)}/yr`}
      />

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-line bg-stone-50/80">
              <tr>
                <th className="th">Merchant</th>
                <th className="th">Cadence</th>
                <th className="th text-right">Typical</th>
                <th className="th text-right">Per month</th>
                <th className="th text-right">Annualised</th>
                <th className="th">Last charge</th>
                <th className="th">Next expected</th>
                <th className="th"># </th>
              </tr>
            </thead>
            <tbody>
              {recurring.map((r) => (
                <tr key={r.key} className="border-b border-line/60 last:border-0 hover:bg-stone-50/60">
                  <td className="td">
                    <div className="flex items-center gap-2 font-medium text-ink">
                      <Repeat className="h-3.5 w-3.5 text-accent" />
                      {r.merchant}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
                        <CategoryIcon category={r.category} className="h-3 w-3" />
                        {r.category}
                      </span>
                      {r.priceIncreased && (
                        <Badge tone="warn">
                          <TrendingUp className="h-3 w-3" /> price up
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="td">{CADENCE_LABEL[r.cadence]}</td>
                  <td className="td text-right nums">{money(r.typicalAmount, baseCurrency)}</td>
                  <td className="td text-right nums">{money(r.annualised / 12, baseCurrency)}</td>
                  <td className="td text-right nums font-medium text-ink">
                    {money(r.annualised, baseCurrency)}
                  </td>
                  <td className="td whitespace-nowrap nums text-ink-faint">{shortDate(r.lastDate)}</td>
                  <td className="td whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-ink-soft nums">
                      <CalendarClock className="h-3.5 w-3.5 text-ink-faint" />
                      {shortDate(r.nextExpected)}
                    </span>
                  </td>
                  <td className="td text-center nums text-ink-faint">{r.occurrences}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
