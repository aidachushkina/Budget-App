import { Search, X } from 'lucide-react';
import type { Filters } from '../lib/filter';
import { EMPTY_FILTERS } from '../lib/filter';

// Compact filter bar used above the transaction table.

export function FilterBar({
  filters,
  setFilters,
  categories,
  resultCount,
  totalCount,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  categories: string[];
  resultCount: number;
  totalCount: number;
}) {
  const patch = (p: Partial<Filters>) => setFilters({ ...filters, ...p });
  const active =
    JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            className="input w-full pl-9"
            placeholder="Search merchant, description…"
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
          />
        </div>
        <select
          className="input"
          value={filters.category}
          onChange={(e) => patch({ category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="chip cursor-pointer gap-2">
          <input
            type="checkbox"
            checked={filters.recurringOnly}
            onChange={(e) => patch({ recurringOnly: e.target.checked })}
          />
          Recurring only
        </label>
        <label className="chip cursor-pointer gap-2">
          <input
            type="checkbox"
            checked={filters.includeIncomplete}
            onChange={(e) => patch({ includeIncomplete: e.target.checked })}
          />
          Show pending/reverted
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-medium text-ink-faint">Date</span>
        <input
          type="date"
          className="input"
          value={filters.dateFrom}
          onChange={(e) => patch({ dateFrom: e.target.value })}
        />
        <span className="text-ink-faint">to</span>
        <input
          type="date"
          className="input"
          value={filters.dateTo}
          onChange={(e) => patch({ dateTo: e.target.value })}
        />
        <span className="ml-2 text-xs font-medium text-ink-faint">Amount</span>
        <input
          type="number"
          inputMode="decimal"
          className="input w-24"
          placeholder="min"
          value={filters.minAmount}
          onChange={(e) => patch({ minAmount: e.target.value })}
        />
        <span className="text-ink-faint">–</span>
        <input
          type="number"
          inputMode="decimal"
          className="input w-24"
          placeholder="max"
          value={filters.maxAmount}
          onChange={(e) => patch({ maxAmount: e.target.value })}
        />

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-ink-faint nums">
            {resultCount} of {totalCount}
          </span>
          {active && (
            <button
              className="btn px-2 py-1 text-xs"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
