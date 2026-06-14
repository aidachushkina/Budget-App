// Shared formatting helpers.

const SYMBOLS: Record<string, string> = {
  GBP: '£', EUR: '€', USD: '$', JPY: '¥', CHF: 'CHF ', PLN: 'zł ',
  AUD: 'A$', CAD: 'C$', SEK: 'kr ', NOK: 'kr ', DKK: 'kr ',
};

export function currencySymbol(code: string): string {
  return SYMBOLS[code] ?? `${code} `;
}

/** Format a money amount with the currency symbol and 2 decimals. */
export function money(value: number, currency = 'GBP'): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${currencySymbol(currency)}${abs}`;
}

/** Format without a sign (for already-signed contexts like tables). */
export function moneyPlain(value: number, currency = 'GBP'): string {
  return `${currencySymbol(currency)}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function shortDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
