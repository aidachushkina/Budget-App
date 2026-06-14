import type { ReactNode } from 'react';

// Small presentational building blocks shared across views.

export function StatCard({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'income' | 'spend';
}) {
  const valueColor =
    tone === 'income' ? 'text-income' : tone === 'spend' ? 'text-spend' : 'text-ink';
  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold nums ${valueColor}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-faint">{sub}</div>}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  right,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-faint">{description}</p>}
      </div>
      {right}
    </div>
  );
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'warn' | 'info' | 'good';
}) {
  const tones: Record<string, string> = {
    default: 'border-line bg-white text-ink-soft',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  };
  return (
    <span className={`chip ${tones[tone]}`}>{children}</span>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white/60 p-8 text-center text-sm text-ink-faint">
      {children}
    </div>
  );
}
