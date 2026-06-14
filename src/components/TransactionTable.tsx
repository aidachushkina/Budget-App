import { useMemo, useState } from 'react';
import { EyeOff, Eye, Repeat } from 'lucide-react';
import type { Transaction } from '../types';
import { useStore } from '../state/store';
import { CategoryIcon } from './categoryIcon';
import { money, moneyPlain, shortDate } from '../lib/format';
import { toBase } from '../lib/fx';

// The transaction preview/edit table. Category and exclusion are editable inline
// and persist through the store.

const PAGE = 60;

export function TransactionTable({
  transactions,
  recurringTxnIds,
}: {
  transactions: Transaction[];
  recurringTxnIds: Set<string>;
}) {
  const { categories, setCategory, setExcluded, baseCurrency, rates } = useStore();
  const [limit, setLimit] = useState(PAGE);

  const visible = useMemo(() => transactions.slice(0, limit), [transactions, limit]);

  if (!transactions.length) {
    return (
      <div className="card text-center text-sm text-ink-faint">
        No transactions match the current filters.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="border-b border-line bg-stone-50/80">
            <tr>
              <th className="th">Date</th>
              <th className="th">Merchant / description</th>
              <th className="th">Category</th>
              <th className="th text-right">Amount</th>
              <th className="th text-right">Fee</th>
              <th className="th text-center">In totals</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <Row
                key={t.id}
                t={t}
                categories={categories}
                onCategory={(c) => setCategory(t.id, c)}
                onExcluded={(ex) => setExcluded(t.id, ex)}
                baseAmount={toBase(t.amount, t.currency, baseCurrency, rates)}
                baseCurrency={baseCurrency}
                isRecurring={recurringTxnIds.has(t.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {limit < transactions.length && (
        <div className="border-t border-line p-3 text-center">
          <button className="btn" onClick={() => setLimit((l) => l + PAGE)}>
            Show more ({transactions.length - limit} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

function Row({
  t,
  categories,
  onCategory,
  onExcluded,
  baseAmount,
  baseCurrency,
  isRecurring,
}: {
  t: Transaction;
  categories: string[];
  onCategory: (c: string) => void;
  onExcluded: (ex: boolean) => void;
  baseAmount: number;
  baseCurrency: string;
  isRecurring: boolean;
}) {
  const isForeign = t.currency !== baseCurrency;
  return (
    <tr
      className={`border-b border-line/70 last:border-0 hover:bg-stone-50/60 ${
        !t.completed ? 'opacity-50' : ''
      } ${t.excluded ? 'bg-stone-50/40' : ''}`}
    >
      <td className="td whitespace-nowrap nums">{shortDate(t.date)}</td>
      <td className="td max-w-[320px]">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-ink">{t.merchant}</span>
          {isRecurring && (
            <Repeat className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="recurring" />
          )}
          {!t.completed && (
            <span className="chip border-amber-200 bg-amber-50 text-[10px] text-amber-800">
              {t.state || 'pending'}
            </span>
          )}
        </div>
        {t.description !== t.merchant && (
          <div className="truncate text-xs text-ink-faint">{t.description}</div>
        )}
      </td>
      <td className="td">
        <div className="flex items-center gap-1.5">
          <CategoryIcon category={t.category} className="h-4 w-4 text-ink-faint" />
          <select
            className="rounded-md border border-line bg-white px-1.5 py-1 text-xs text-ink-soft outline-none focus:border-accent"
            value={t.category}
            onChange={(e) => onCategory(e.target.value)}
          >
            {!categories.includes(t.category) && (
              <option value={t.category}>{t.category}</option>
            )}
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="td text-right nums">
        <span className={t.amount < 0 ? 'text-spend' : 'text-income'}>
          {moneyPlain(t.amount, t.currency)}
        </span>
        {isForeign && (
          <div className="text-xs text-ink-faint">
            ≈ {money(baseAmount, baseCurrency)}
          </div>
        )}
      </td>
      <td className="td text-right nums text-ink-faint">
        {t.fee ? moneyPlain(t.fee, t.currency) : '—'}
      </td>
      <td className="td text-center">
        <button
          className="inline-flex items-center justify-center rounded-md p-1 text-ink-faint hover:bg-stone-100"
          title={t.excluded ? 'Excluded — click to include' : 'Counted — click to exclude'}
          onClick={() => onExcluded(!t.excluded)}
        >
          {t.excluded ? (
            <EyeOff className="h-4 w-4 text-amber-600" />
          ) : (
            <Eye className="h-4 w-4 text-emerald-600" />
          )}
        </button>
      </td>
    </tr>
  );
}
