import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ColumnMapping, RawRow, Transaction } from '../types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_RULES,
  type KeywordRule,
} from '../lib/categories';
import { categorizeOne } from '../lib/categorize';
import { normalize } from '../lib/normalize';
import { dominantCurrency, type FxRates } from '../lib/fx';

// Single source of truth for the session. Persisted to sessionStorage so edits
// survive reloads within the tab but vanish when the tab closes — privacy-first,
// and nothing is written to disk or sent anywhere.

const STORAGE_KEY = 'budget-app:session:v1';

interface PersistShape {
  rawRows: RawRow[];
  mapping: ColumnMapping | null;
  categories: string[];
  rules: KeywordRule[];
  // Per-transaction overrides keyed by id.
  categoryOverrides: Record<string, string>;
  excludeOverrides: Record<string, boolean>;
  baseCurrency: string;
  rates: FxRates;
  fileName: string | null;
}

interface StoreValue {
  // Raw data
  rawRows: RawRow[];
  headers: string[];
  mapping: ColumnMapping | null;
  fileName: string | null;
  // Derived
  transactions: Transaction[];
  // Config
  categories: string[];
  rules: KeywordRule[];
  baseCurrency: string;
  rates: FxRates;
  hasData: boolean;
  // Actions
  loadData: (
    rawRows: RawRow[],
    headers: string[],
    mapping: ColumnMapping,
    fileName: string,
  ) => void;
  setMapping: (m: ColumnMapping) => void;
  reset: () => void;
  setCategory: (txnId: string, category: string) => void;
  setExcluded: (txnId: string, excluded: boolean) => void;
  addCategory: (name: string) => void;
  renameCategory: (oldName: string, newName: string) => void;
  setRules: (rules: KeywordRule[]) => void;
  setBaseCurrency: (c: string) => void;
  setRate: (currency: string, rate: number) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function loadPersisted(): Partial<PersistShape> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistShape) : {};
  } catch {
    return {};
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const persisted = useRef(loadPersisted()).current;

  const [rawRows, setRawRows] = useState<RawRow[]>(persisted.rawRows ?? []);
  const [mapping, setMappingState] = useState<ColumnMapping | null>(
    persisted.mapping ?? null,
  );
  const [fileName, setFileName] = useState<string | null>(persisted.fileName ?? null);
  const [categories, setCategories] = useState<string[]>(
    persisted.categories ?? [...DEFAULT_CATEGORIES],
  );
  const [rules, setRulesState] = useState<KeywordRule[]>(
    persisted.rules ?? DEFAULT_RULES,
  );
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>(
    persisted.categoryOverrides ?? {},
  );
  const [excludeOverrides, setExcludeOverrides] = useState<Record<string, boolean>>(
    persisted.excludeOverrides ?? {},
  );
  const [baseCurrency, setBaseCurrencyState] = useState<string>(
    persisted.baseCurrency ?? 'GBP',
  );
  const [rates, setRates] = useState<FxRates>(persisted.rates ?? {});

  const headers = useMemo(
    () => (rawRows[0] ? Object.keys(rawRows[0]) : []),
    [rawRows],
  );

  // Derive normalised + categorised transactions, applying user overrides.
  const transactions = useMemo<Transaction[]>(() => {
    if (!mapping || !rawRows.length) return [];
    const { transactions: base } = normalize(rawRows, mapping);
    return base.map((t) => {
      const autoCat = categorizeOne(t, rules);
      const category = categoryOverrides[t.id] ?? autoCat;
      const excluded =
        excludeOverrides[t.id] !== undefined ? excludeOverrides[t.id] : t.excluded;
      return { ...t, category, excluded };
    });
  }, [rawRows, mapping, rules, categoryOverrides, excludeOverrides]);

  // Persist to sessionStorage on any change.
  useEffect(() => {
    const payload: PersistShape = {
      rawRows,
      mapping,
      categories,
      rules,
      categoryOverrides,
      excludeOverrides,
      baseCurrency,
      rates,
      fileName,
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage may be full or disabled; the app still works in-memory.
    }
  }, [
    rawRows, mapping, categories, rules, categoryOverrides,
    excludeOverrides, baseCurrency, rates, fileName,
  ]);

  const value: StoreValue = {
    rawRows,
    headers,
    mapping,
    fileName,
    transactions,
    categories,
    rules,
    baseCurrency,
    rates,
    hasData: rawRows.length > 0 && !!mapping,

    loadData(newRows, _headers, newMapping, name) {
      setRawRows(newRows);
      setMappingState(newMapping);
      setFileName(name);
      setCategoryOverrides({});
      setExcludeOverrides({});
      // Default base currency to the dominant one in the data.
      const { transactions: base } = normalize(newRows, newMapping);
      const dom = dominantCurrency(base);
      setBaseCurrencyState(dom);
    },
    setMapping(m) {
      setMappingState(m);
    },
    reset() {
      setRawRows([]);
      setMappingState(null);
      setFileName(null);
      setCategoryOverrides({});
      setExcludeOverrides({});
      setCategories([...DEFAULT_CATEGORIES]);
      setRulesState(DEFAULT_RULES);
      setRates({});
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    },
    setCategory(txnId, category) {
      setCategoryOverrides((prev) => ({ ...prev, [txnId]: category }));
      if (!categories.includes(category)) {
        setCategories((prev) => [...prev, category]);
      }
    },
    setExcluded(txnId, excluded) {
      setExcludeOverrides((prev) => ({ ...prev, [txnId]: excluded }));
    },
    addCategory(name) {
      const trimmed = name.trim();
      if (trimmed && !categories.includes(trimmed)) {
        setCategories((prev) => [...prev, trimmed]);
      }
    },
    renameCategory(oldName, newName) {
      const trimmed = newName.trim();
      if (!trimmed || oldName === trimmed) return;
      setCategories((prev) =>
        prev.map((c) => (c === oldName ? trimmed : c)).filter((c, i, a) => a.indexOf(c) === i),
      );
      // Re-point overrides and rules that referenced the old name.
      setCategoryOverrides((prev) => {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(prev)) next[k] = v === oldName ? trimmed : v;
        return next;
      });
      setRulesState((prev) =>
        prev.map((r) => (r.category === oldName ? { ...r, category: trimmed } : r)),
      );
    },
    setRules(newRules) {
      setRulesState(newRules);
    },
    setBaseCurrency(c) {
      setBaseCurrencyState(c.toUpperCase());
    },
    setRate(currency, rate) {
      setRates((prev) => ({ ...prev, [currency]: rate }));
    },
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
