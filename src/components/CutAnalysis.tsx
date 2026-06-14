import {
  Scissors,
  Copy,
  TrendingUp,
  Coffee,
  Info,
} from 'lucide-react';
import type { CutFlag, DiscretionarySplit } from '../lib/analysis';
import { SectionTitle, EmptyHint, StatCard } from './ui';
import { money } from '../lib/format';

// "Could be cut" — transparent, rule-based flags. Explicitly labelled as
// flagged for review, never as advice.

const KIND_META: Record<
  CutFlag['kind'],
  { label: string; icon: typeof Info; tone: string }
> = {
  'top-recurring': { label: 'Top recurring', icon: Scissors, tone: 'text-accent' },
  duplicate: { label: 'Overlapping services', icon: Copy, tone: 'text-rose-600' },
  'price-increase': { label: 'Price increase', icon: TrendingUp, tone: 'text-amber-600' },
  'small-frequent': { label: 'Small & frequent', icon: Coffee, tone: 'text-sky-600' },
};

export function CutAnalysis({
  flags,
  split,
  baseCurrency,
}: {
  flags: CutFlag[];
  split: DiscretionarySplit;
  baseCurrency: string;
}) {
  const discretionaryTotal = split.discretionary;
  const essentialTotal = split.essential;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Could be cut"
        description="Transparent, rule-based flags for you to review — not financial advice."
      />

      <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Everything below is <strong>flagged for review</strong> using simple,
          inspectable rules (recurring cadence, keyword families, amount changes,
          frequency). You decide what actually matters.
        </span>
      </div>

      {/* Essentials vs discretionary split */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Essential spend"
          value={money(essentialTotal, baseCurrency)}
          sub="Groceries, bills, transport, health"
        />
        <StatCard
          label="Discretionary spend"
          value={money(discretionaryTotal, baseCurrency)}
          tone="spend"
          sub="Dining, shopping, subscriptions, travel"
        />
        <StatCard
          label="Other / uncategorised"
          value={money(split.other, baseCurrency)}
          sub="Re-tag these for a cleaner split"
        />
      </div>

      {flags.length === 0 ? (
        <EmptyHint>
          Nothing flagged yet. Once there are enough recurring charges or repeated
          small spends, suggestions will appear here.
        </EmptyHint>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {flags.map((f, i) => {
            const meta = KIND_META[f.kind];
            const Icon = meta.icon;
            return (
              <div key={i} className="card flex items-start gap-3">
                <div className={`mt-0.5 ${meta.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                      {meta.label}
                    </span>
                    <span className="text-xs font-semibold nums text-ink">
                      ~{money(f.annual, baseCurrency)}/yr
                    </span>
                  </div>
                  <div className="mt-0.5 font-medium text-ink">{f.title}</div>
                  <p className="mt-1 text-sm text-ink-soft">{f.detail}</p>
                  <div className="mt-2 text-xs text-ink-faint nums">
                    {money(f.monthly, baseCurrency)}/mo · {f.txnIds.length} transactions
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
