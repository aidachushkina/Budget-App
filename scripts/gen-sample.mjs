// Generates a synthetic Revolut-style CSV with realistic patterns so the app
// can be tested without any real data. Run: node scripts/gen-sample.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const rows = [];
let balance = 1850.0;

function iso(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
function add(type, desc, amount, opts = {}) {
  const { date, currency = 'GBP', fee = 0, state = 'COMPLETED', product = 'Current' } = opts;
  balance += amount - fee;
  rows.push({
    Type: type,
    Product: product,
    'Started Date': iso(date),
    'Completed Date': iso(date),
    Description: desc,
    Amount: amount.toFixed(2),
    Fee: fee.toFixed(2),
    Currency: currency,
    State: state,
    Balance: balance.toFixed(2),
  });
}
const at = (y, m, d, h = 9) => new Date(y, m - 1, d, h, 0, 0);

// Three full months: March, April, May 2026.
for (const [mi, month] of [3, 4, 5].entries()) {
  const y = 2026;

  // Salary (income) on the 28th.
  add('CARD_PAYMENT', 'Salary - Acme Ltd', 2600.0, { date: at(y, month, 28, 8), type: 'TOPUP' });

  // --- Subscriptions (monthly) ---
  // Netflix with a price increase in May.
  const netflix = month === 5 ? -12.99 : -10.99;
  add('CARD_PAYMENT', 'Netflix.com', netflix, { date: at(y, month, 3) });
  add('CARD_PAYMENT', 'Disney Plus', -7.99, { date: at(y, month, 6) });
  add('CARD_PAYMENT', 'Spotify P0A1B2', -11.99, { date: at(y, month, 9) });
  add('CARD_PAYMENT', 'Apple.com/Bill iCloud', -2.99, { date: at(y, month, 11) });
  add('CARD_PAYMENT', 'Google One Storage', -1.99, { date: at(y, month, 12) });
  add('CARD_PAYMENT', 'PureGym Limited', -24.99, { date: at(y, month, 2) });
  add('CARD_PAYMENT', 'Amazon Prime', -8.99, { date: at(y, month, 15) });

  // --- Utilities / bills (monthly) ---
  add('CARD_PAYMENT', 'Vodafone Ltd', -18.0, { date: at(y, month, 5) });
  add('CARD_PAYMENT', 'Octopus Energy', -74.5, { date: at(y, month, 7) });
  add('CARD_PAYMENT', 'Thames Water', -32.0, { date: at(y, month, 14) });

  // --- Transfers / savings (should be excluded) ---
  add('TRANSFER', 'To EUR Pocket', -150.0, { date: at(y, month, 28, 9) });
  add('TOPUP', 'Top-Up by *1234', 100.0, { date: at(y, month, 1, 7) });

  // --- Groceries weekly (Tesco / Sainsbury / Lidl) ---
  const groceryStores = ['Tesco Stores 3471', "Sainsbury's S/mkt", 'Lidl GB London', 'Tesco Express'];
  for (let w = 0; w < 4; w++) {
    const day = 4 + w * 7;
    const amt = -(38 + ((mi + w) % 4) * 6 + (w === 2 ? 9.5 : 0));
    add('CARD_PAYMENT', groceryStores[w % groceryStores.length], amt, { date: at(y, month, day, 18) });
  }

  // --- Coffee: frequent small spends ---
  for (let k = 0; k < 7; k++) {
    const day = 2 + k * 4;
    add('CARD_PAYMENT', k % 2 ? 'Pret A Manger' : 'Starbucks Coffee', -(3.4 + (k % 3) * 0.35), {
      date: at(y, month, Math.min(day, 27), 8),
    });
  }

  // --- Dining / takeaway ---
  add('CARD_PAYMENT', 'Deliveroo', -23.5, { date: at(y, month, 10, 20) });
  add('CARD_PAYMENT', 'Deliveroo', -19.9, { date: at(y, month, 24, 20) });
  add('CARD_PAYMENT', 'Nando\'s Chickenland', -27.4, { date: at(y, month, 17, 19) });
  add('CARD_PAYMENT', 'Wagamama', -34.2, { date: at(y, month, 21, 19) });

  // --- Transport ---
  add('CARD_PAYMENT', 'TfL Travel Charge', -32.4, { date: at(y, month, 6, 8) });
  add('CARD_PAYMENT', 'Trainline', -48.6, { date: at(y, month, 19, 7) });
  add('CARD_PAYMENT', 'Uber BV', -14.2, { date: at(y, month, 23, 23) });

  // --- Shopping ---
  add('CARD_PAYMENT', 'Amazon.co.uk*A1B2C', -(29.99 + mi * 5), { date: at(y, month, 13, 12) });
  add('CARD_PAYMENT', 'Zara UK', -49.99, { date: at(y, month, 16, 15), state: mi === 1 ? 'REVERTED' : 'COMPLETED' });

  // --- Health ---
  add('CARD_PAYMENT', 'Boots Pharmacy', -12.45, { date: at(y, month, 8, 13) });

  // --- ATM ---
  add('ATM', 'Cash Withdrawal ATM', -40.0, { date: at(y, month, 20, 17), fee: 1.5 });

  // --- A couple of EUR transactions (multi-currency) ---
  add('CARD_PAYMENT', 'SNCF Paris', -45.0, { date: at(y, month, 18, 10), currency: 'EUR' });
  add('CARD_PAYMENT', 'Carrefour City', -16.3, { date: at(y, month, 18, 13), currency: 'EUR' });

  // A refund (positive, non-salary).
  add('CARD_PAYMENT', 'Amazon.co.uk Refund', 14.5, { date: at(y, month, 26, 11) });
}

// A pending (non-completed) row to prove filtering works.
add('CARD_PAYMENT', 'ASOS.com', -64.0, { date: at(2026, 5, 30, 14), state: 'PENDING' });

const headers = ['Type', 'Product', 'Started Date', 'Completed Date', 'Description', 'Amount', 'Fee', 'Currency', 'State', 'Balance'];
const escape = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(String(r[h]))).join(','))].join('\n');

mkdirSync(resolve(root, 'public'), { recursive: true });
writeFileSync(resolve(root, 'public/sample-revolut.csv'), csv + '\n');

// Also emit a TS module so the in-app "try sample" button needs no fetch.
const ts = `// AUTO-GENERATED by scripts/gen-sample.mjs — synthetic fake data, safe to ship.
// Regenerate with: node scripts/gen-sample.mjs
export const SAMPLE_CSV = ${JSON.stringify(csv + '\n')};
`;
mkdirSync(resolve(root, 'src/lib'), { recursive: true });
writeFileSync(resolve(root, 'src/lib/sample.ts'), ts);

console.log(`Wrote ${rows.length} sample rows to public/sample-revolut.csv and src/lib/sample.ts`);
