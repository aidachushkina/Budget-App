# Budget — local, privacy-first statement analysis

Upload a Revolut statement export and see where your money goes: spending by
category, recurring subscriptions, and a transparent "could be cut" review.

**Everything runs on your machine.** The file is parsed and analysed entirely in
your browser. No data is uploaded, no account is required, nothing is stored on a
server. Your edits live in the browser tab's session storage only and are gone
when you close the tab.

## Run it

**Requires Node.js 20 or newer** (Vite 5 needs it; Node 16/18 will fail to start
the dev server). Check with `node -v`. If you use nvm, run `nvm use` (an `.nvmrc`
pins Node 20). In GitHub Codespaces the included devcontainer already uses Node 20.

```bash
npm install
npm run dev
```

> Note: `npm audit` may warn about `esbuild`/`vite`. That advisory only affects
> Vite's **dev server** talking to a browser on your own machine and does not
> apply to this local-only app. **Do not run `npm audit fix --force`** — it would
> upgrade Vite to a major version that breaks the build. The pinned versions here
> are correct.

Then open the printed URL (default <http://localhost:5173>). Click
**"try it with synthetic sample data"** to explore with fake data, or upload your
own export.

To export from Revolut, choose **Statements → Excel/CSV**. CSV is the
recommended, most reliable format. PDF is supported as a best-effort fallback.

## What it does

- **Dynamic column mapping.** Revolut's columns vary, so nothing is hardcoded.
  The header row is detected and fields are mapped automatically; the detected
  mapping is shown on the Transactions tab and you can correct any field.
- **Clean handling of the messy bits.** Only `COMPLETED` rows count toward totals
  (pending/reverted are shown but excluded); negative amounts are spend, positive
  are income/refunds; fees are tracked separately; internal transfers and top-ups
  are detected and excluded from spend — and you can re-tag anything it gets wrong
  with the eye toggle.
- **Auto-categorisation** into editable categories using transparent merchant
  keyword rules. Every category, every rule, and every transaction's category is
  editable, and edits persist for the session.
- **Recurring detection.** Finds merchants billed on a regular cadence
  (weekly/monthly/quarterly/annual) with similar amounts, and shows cadence,
  typical amount, last charge, and next expected date.
- **"Could be cut" review** — rule-based and labelled *flagged for review*, never
  advice: essentials vs discretionary split, top recurring by annualised cost,
  overlapping streaming/cloud subscriptions, price creep on recurring charges, and
  small frequent spends that add up.
- **Summary dashboard:** income, spend, net, savings rate; spend by category as a
  table and chart; top 10 merchants; recurring burden per month and annualised.
- **Filtering & search** by text, category, date range, amount, and recurring-only.
- **Multi-currency.** Original currency is always shown; set a base currency and a
  simple manual FX rate for any other currency (rates are never fetched online).
- **Export** the categorised transactions and the summary as CSV.

## Tech

React + Vite + TypeScript, Tailwind, PapaParse (CSV), pdf.js (PDF), Recharts,
lucide-react icons. No backend.

## Project layout

```
src/
  lib/          Pure logic: parsing, mapping, categorisation, recurring,
                analysis, FX, CSV export, formatting. (Framework-free.)
  state/        Session store (React context + sessionStorage persistence).
  components/   UI: upload, mapping editor, table, dashboard, recurring view,
                cut analysis, filters, settings.
scripts/
  gen-sample.mjs  Regenerates the synthetic sample CSV + in-app sample module.
  smoke.mjs       Sanity-checks the analysis pipeline against the sample.
```

The sample data in `public/sample-revolut.csv` is entirely synthetic.

## Notes

- Your data never leaves the browser. Session data clears when the tab closes;
  use **New file** to clear it immediately.
- Auto-categorisation rules are simple keyword matches you can inspect and edit on
  the Settings tab — there is no opaque model.
