import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useStore } from '../state/store';
import { FIELD_LABELS, REQUIRED_FIELDS } from '../lib/mapping';
import type { ColumnMapping, FieldKey } from '../types';
import { SectionTitle } from './ui';

const FIELD_ORDER: FieldKey[] = [
  'completedDate', 'startedDate', 'description', 'amount', 'fee',
  'currency', 'type', 'state', 'product', 'balance',
];

// Shows the detected column mapping and lets the user correct any field. This
// directly satisfies the "show me the mapping so I can fix it" requirement.

export function MappingEditor() {
  const { headers, mapping, setMapping, rawRows } = useStore();
  const [open, setOpen] = useState(false);

  if (!mapping) return null;

  const missingRequired = REQUIRED_FIELDS.filter((f) => !mapping[f]);
  const sample = rawRows[0] ?? {};

  function update(field: FieldKey, value: string) {
    const next: ColumnMapping = { ...mapping!, [field]: value || null };
    setMapping(next);
  }

  return (
    <div className="card">
      <button
        className="flex w-full items-center justify-between"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <SectionTitle title="Detected column mapping" />
        </div>
        <div className="flex items-center gap-3">
          {missingRequired.length > 0 ? (
            <span className="chip border-amber-200 bg-amber-50 text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" /> Needs attention
            </span>
          ) : (
            <span className="chip border-emerald-200 bg-emerald-50 text-emerald-800">
              <Check className="h-3.5 w-3.5" /> Looks good
            </span>
          )}
          {open ? <ChevronUp className="h-5 w-5 text-ink-faint" /> : <ChevronDown className="h-5 w-5 text-ink-faint" />}
        </div>
      </button>

      {!open && (
        <p className="-mt-2 text-sm text-ink-faint">
          We matched your file's columns to the fields below. Click to review or correct.
        </p>
      )}

      {open && (
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FIELD_ORDER.map((field) => {
            const required = REQUIRED_FIELDS.includes(field);
            const current = mapping[field];
            const example = current ? sample[current] : '';
            return (
              <label key={field} className="block">
                <span className="flex items-center gap-1 text-xs font-medium text-ink-soft">
                  {FIELD_LABELS[field]}
                  {required && <span className="text-spend">*</span>}
                </span>
                <select
                  className="input mt-1 w-full"
                  value={current ?? ''}
                  onChange={(e) => update(field, e.target.value)}
                >
                  <option value="">— not mapped —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                {example !== '' && example != null && (
                  <span className="mt-1 block truncate text-xs text-ink-faint">
                    e.g. “{String(example)}”
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {missingRequired.length > 0 && (
        <p className="mt-3 text-sm text-amber-800">
          Please map: {missingRequired.map((f) => FIELD_LABELS[f]).join(', ')}.
        </p>
      )}
    </div>
  );
}
