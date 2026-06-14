import Papa from 'papaparse';
import type { RawRow } from '../types';

// File parsing happens entirely in the browser. Nothing is uploaded anywhere.

export interface ParsedFile {
  headers: string[];
  rows: RawRow[];
}

/**
 * Some bank CSVs include a few preamble lines before the real header row.
 * Find the row that looks most like a header (most non-empty, mostly text).
 */
function findHeaderIndex(matrix: string[][]): number {
  let bestIdx = 0;
  let bestScore = -Infinity;
  const limit = Math.min(matrix.length, 15);
  for (let i = 0; i < limit; i++) {
    const row = matrix[i];
    const nonEmpty = row.filter((c) => c && c.trim()).length;
    if (nonEmpty < 2) continue;
    const textCells = row.filter((c) => c && /[a-zA-Z]/.test(c)).length;
    const numericCells = row.filter((c) => c && /^[-\d.,$£€\s()]+$/.test(c.trim())).length;
    // Headers are wide, texty, and not numeric.
    const score = nonEmpty * 2 + textCells - numericCells * 3;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Parse a CSV File into headers + row objects, skipping any preamble. */
export function parseCsv(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: 'greedy',
      complete: (res) => {
        try {
          const matrix = res.data as unknown as string[][];
          if (!matrix.length) {
            resolve({ headers: [], rows: [] });
            return;
          }
          const headerIdx = findHeaderIndex(matrix);
          const rawHeaders = matrix[headerIdx].map((h) => (h ?? '').trim());
          // De-duplicate blank/repeat headers so row objects stay addressable.
          const seen = new Map<string, number>();
          const headers = rawHeaders.map((h, i) => {
            let name = h || `Column ${i + 1}`;
            if (seen.has(name)) {
              const n = seen.get(name)! + 1;
              seen.set(name, n);
              name = `${name} (${n})`;
            } else {
              seen.set(name, 1);
            }
            return name;
          });

          const rows: RawRow[] = [];
          for (let i = headerIdx + 1; i < matrix.length; i++) {
            const cells = matrix[i];
            if (!cells || cells.every((c) => !c || !c.trim())) continue;
            const row: RawRow = {};
            headers.forEach((h, j) => {
              row[h] = (cells[j] ?? '').trim();
            });
            rows.push(row);
          }
          resolve({ headers, rows });
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Parse a PDF statement in-browser using pdf.js. This is a best-effort text
 * extraction; CSV is strongly preferred. We pull text lines and try to find
 * tabular transaction rows. Returns the same shape as CSV parsing.
 */
export async function parsePdf(file: File): Promise<ParsedFile> {
  const pdfjs = await import('pdfjs-dist');
  // Use the bundled worker so nothing is fetched from a CDN.
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = (worker as { default: string }).default;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const lines: string[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Group text items into visual lines by their y position.
    const byLine = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items as { str: string; transform: number[] }[]) {
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!byLine.has(y)) byLine.set(y, []);
      byLine.get(y)!.push({ x, str: item.str });
    }
    const ys = [...byLine.keys()].sort((a, b) => b - a);
    for (const y of ys) {
      const cells = byLine.get(y)!.sort((a, b) => a.x - b.x);
      const text = cells.map((c) => c.str).join(' ').replace(/\s+/g, ' ').trim();
      if (text) lines.push(text);
    }
  }

  // Heuristic table extraction: a transaction line starts with a date and ends
  // with a signed amount. Everything between is the description.
  const dateRe = /^(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+\w{3,9}\s+\d{2,4})/;
  const amountRe = /(-?[£$€]?\s?\d[\d,. ]*\d|\d)(?:\s*(?:CR|DR))?$/i;
  const rows: RawRow[] = [];
  for (const line of lines) {
    const dm = line.match(dateRe);
    const am = line.match(amountRe);
    if (dm && am) {
      const date = dm[0];
      const amount = am[0];
      const desc = line.slice(dm[0].length, line.length - am[0].length).trim();
      if (desc) {
        rows.push({ Date: date, Description: desc, Amount: amount });
      }
    }
  }

  return { headers: ['Date', 'Description', 'Amount'], rows };
}

export function parseAnyFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return parsePdf(file);
  }
  return parseCsv(file);
}
