import { useState } from 'react';
import { Plus, Trash2, Coins } from 'lucide-react';
import { useStore } from '../state/store';
import { SectionTitle } from './ui';
import { foreignCurrencies } from '../lib/fx';
import type { KeywordRule } from '../lib/categories';

// Currency / FX, category management, and keyword rule editing. All edits flow
// through the store and persist for the session.

export function Settings() {
  const {
    transactions, baseCurrency, setBaseCurrency, rates, setRate,
    categories, addCategory, renameCategory, rules, setRules,
  } = useStore();

  const foreign = foreignCurrencies(transactions, baseCurrency);
  const allCurrencies = [...new Set([baseCurrency, ...transactions.map((t) => t.currency)])].sort();

  const [newCat, setNewCat] = useState('');

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Settings"
        description="Currency, categories and the keyword rules behind auto-categorisation."
      />

      {/* Currency & FX */}
      <div className="card">
        <h3 className="mb-1 flex items-center gap-2 font-semibold text-ink">
          <Coins className="h-4 w-4 text-accent" /> Currency
        </h3>
        <p className="mb-3 text-sm text-ink-faint">
          Original currency is always shown. Set a base currency and a simple manual
          rate for any other currency to roll everything up. Rates are never fetched
          online.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="text-xs font-medium text-ink-soft">Base currency</span>
            <select
              className="input mt-1 block"
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
            >
              {allCurrencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {foreign.length === 0 ? (
            <p className="text-sm text-ink-faint">Single currency — no FX needed.</p>
          ) : (
            foreign.map((c) => (
              <label key={c} className="block">
                <span className="text-xs font-medium text-ink-soft">
                  1 {c} = ? {baseCurrency}
                </span>
                <input
                  type="number"
                  step="0.0001"
                  inputMode="decimal"
                  className="input mt-1 block w-28"
                  placeholder="rate"
                  value={rates[c] ?? ''}
                  onChange={(e) => setRate(c, parseFloat(e.target.value))}
                />
              </label>
            ))
          )}
        </div>
        {foreign.some((c) => !rates[c]) && (
          <p className="mt-2 text-xs text-amber-700">
            Tip: currencies without a rate are counted 1:1 until you set one.
          </p>
        )}
      </div>

      {/* Categories */}
      <div className="card">
        <h3 className="mb-3 font-semibold text-ink">Categories</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <EditableCategory key={c} name={c} onRename={(n) => renameCategory(c, n)} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            className="input"
            placeholder="New category name"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newCat.trim()) {
                addCategory(newCat);
                setNewCat('');
              }
            }}
          />
          <button
            className="btn"
            onClick={() => {
              addCategory(newCat);
              setNewCat('');
            }}
            disabled={!newCat.trim()}
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Keyword rules */}
      <RuleEditor rules={rules} setRules={setRules} categories={categories} />
    </div>
  );
}

function EditableCategory({
  name,
  onRename,
}: {
  name: string;
  onRename: (n: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  if (editing) {
    return (
      <input
        autoFocus
        className="input px-2 py-1 text-xs"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          onRename(value);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onRename(value);
            setEditing(false);
          }
        }}
      />
    );
  }
  return (
    <button className="chip hover:bg-stone-50" onClick={() => setEditing(true)} title="Rename">
      {name}
    </button>
  );
}

function RuleEditor({
  rules,
  setRules,
  categories,
}: {
  rules: KeywordRule[];
  setRules: (r: KeywordRule[]) => void;
  categories: string[];
}) {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState(categories[0] ?? 'Other');
  const [showAll, setShowAll] = useState(false);

  const shown = showAll ? rules : rules.slice(0, 12);

  return (
    <div className="card">
      <h3 className="mb-1 font-semibold text-ink">Auto-categorisation rules</h3>
      <p className="mb-3 text-sm text-ink-faint">
        Each rule maps a keyword found in a merchant/description to a category. Rules
        are checked top to bottom; the first match wins. Editing here re-categorises
        everything that you haven't manually overridden.
      </p>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <input
          className="input"
          placeholder="keyword (e.g. spotify)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value.toLowerCase())}
        />
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          className="btn"
          disabled={!keyword.trim()}
          onClick={() => {
            setRules([{ keyword: keyword.trim(), category }, ...rules]);
            setKeyword('');
          }}
        >
          <Plus className="h-4 w-4" /> Add rule (top priority)
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-lg border border-line">
        <table className="min-w-full">
          <tbody>
            {shown.map((r, i) => (
              <tr key={`${r.keyword}-${i}`} className="border-b border-line/60 last:border-0">
                <td className="td font-mono text-xs text-ink">{r.keyword}</td>
                <td className="td">
                  <select
                    className="rounded-md border border-line bg-white px-1.5 py-1 text-xs"
                    value={r.category}
                    onChange={(e) => {
                      const next = [...rules];
                      next[i] = { ...r, category: e.target.value };
                      setRules(next);
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="td text-right">
                  <button
                    className="text-ink-faint hover:text-spend"
                    onClick={() => setRules(rules.filter((_, j) => j !== i))}
                    title="Delete rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rules.length > 12 && (
        <button className="mt-2 text-xs font-medium text-accent" onClick={() => setShowAll((s) => !s)}>
          {showAll ? 'Show fewer' : `Show all ${rules.length} rules`}
        </button>
      )}
    </div>
  );
}
