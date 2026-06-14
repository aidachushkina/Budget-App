import { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Table2,
  Repeat,
  Scissors,
  SlidersHorizontal,
  Wallet,
  RotateCcw,
  Download,
} from 'lucide-react';
import { StoreProvider, useStore } from './state/store';
import { Upload } from './components/Upload';
import { MappingEditor } from './components/MappingEditor';
import { FilterBar } from './components/Filters';
import { TransactionTable } from './components/TransactionTable';
import { Dashboard } from './components/Dashboard';
import { RecurringView } from './components/RecurringView';
import { CutAnalysis } from './components/CutAnalysis';
import { Settings } from './components/Settings';
import { EMPTY_FILTERS, applyFilters, type Filters } from './lib/filter';
import { detectRecurring } from './lib/recurring';
import { buildSummary, buildCutFlags, splitDiscretionary } from './lib/analysis';
import { exportTransactions } from './lib/exportCsv';
import { shortDate } from './lib/format';

type Tab = 'dashboard' | 'transactions' | 'recurring' | 'cut' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof Table2 }[] = [
  { id: 'dashboard', label: 'Summary', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: Table2 },
  { id: 'recurring', label: 'Recurring', icon: Repeat },
  { id: 'cut', label: 'Could be cut', icon: Scissors },
  { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
];

function Workspace() {
  const {
    hasData, transactions, baseCurrency, rates, categories, fileName, reset,
  } = useStore();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  // Derived analytics — recomputed whenever data, categories or FX change.
  const recurring = useMemo(
    () => detectRecurring(transactions, { baseCurrency, rates }),
    [transactions, baseCurrency, rates],
  );
  const recurringTxnIds = useMemo(
    () => new Set(recurring.flatMap((r) => r.txnIds)),
    [recurring],
  );
  const summary = useMemo(
    () => buildSummary(transactions, { baseCurrency, rates, recurring }),
    [transactions, baseCurrency, rates, recurring],
  );
  const cutFlags = useMemo(
    () => buildCutFlags(transactions, { baseCurrency, rates, recurring }),
    [transactions, baseCurrency, rates, recurring],
  );
  const split = useMemo(
    () => splitDiscretionary(transactions, baseCurrency, rates),
    [transactions, baseCurrency, rates],
  );

  const filtered = useMemo(
    () => applyFilters(transactions, filters, recurringTxnIds),
    [transactions, filters, recurringTxnIds],
  );

  if (!hasData) {
    return <Upload />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-2.5">
          <Wallet className="h-6 w-6 text-accent" />
          <div>
            <h1 className="text-lg font-semibold leading-tight text-ink">Budget</h1>
            <p className="text-xs text-ink-faint">
              {fileName} · {transactions.length} rows
              {summary.periodStart &&
                ` · ${shortDate(summary.periodStart)}–${shortDate(summary.periodEnd)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn"
            onClick={() => exportTransactions(transactions, baseCurrency, rates)}
          >
            <Download className="h-4 w-4" /> Export data
          </button>
          <button
            className="btn"
            onClick={() => {
              if (confirm('Clear all loaded data and start over?')) reset();
            }}
          >
            <RotateCcw className="h-4 w-4" /> New file
          </button>
        </div>
      </header>

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'border-accent text-ink'
                  : 'border-transparent text-ink-faint hover:text-ink-soft'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.id === 'recurring' && recurring.length > 0 && (
                <span className="rounded-full bg-accent-soft px-1.5 text-xs text-accent">
                  {recurring.length}
                </span>
              )}
              {t.id === 'cut' && cutFlags.length > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-700">
                  {cutFlags.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <main>
        {tab === 'dashboard' && (
          <Dashboard summary={summary} recurring={recurring} baseCurrency={baseCurrency} />
        )}
        {tab === 'transactions' && (
          <div className="space-y-4">
            <MappingEditor />
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              categories={categories}
              resultCount={filtered.length}
              totalCount={transactions.length}
            />
            <TransactionTable transactions={filtered} recurringTxnIds={recurringTxnIds} />
          </div>
        )}
        {tab === 'recurring' && (
          <RecurringView recurring={recurring} baseCurrency={baseCurrency} />
        )}
        {tab === 'cut' && (
          <CutAnalysis flags={cutFlags} split={split} baseCurrency={baseCurrency} />
        )}
        {tab === 'settings' && <Settings />}
      </main>

      <footer className="mt-12 border-t border-line pt-4 text-center text-xs text-ink-faint">
        All processing happens locally in your browser. Nothing is uploaded. Data is
        kept only for this browser session.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Workspace />
    </StoreProvider>
  );
}
