import { useRef, useState } from 'react';
import { Upload as UploadIcon, FileText, ShieldCheck, AlertCircle } from 'lucide-react';
import { parseAnyFile } from '../lib/parseFile';
import { detectMapping } from '../lib/mapping';
import { useStore } from '../state/store';
import { SAMPLE_CSV } from '../lib/sample';

// First-run screen: drag/drop or pick a file. Makes the privacy stance explicit
// and steers the user toward CSV.

export function Upload() {
  const { loadData } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const parsed = await parseAnyFile(file);
      if (!parsed.headers.length || !parsed.rows.length) {
        setError('No rows found. Is this a statement export? CSV works best.');
        return;
      }
      const mapping = detectMapping(parsed.headers);
      if (!mapping.amount) {
        setError(
          'Could not find an amount column automatically — you can map it on the next screen.',
        );
      }
      loadData(parsed.rows, parsed.headers, mapping, file.name);
    } catch (e) {
      setError(`Could not parse the file: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function loadSample() {
    setBusy(true);
    setError(null);
    try {
      const file = new File([SAMPLE_CSV], 'sample-revolut.csv', { type: 'text/csv' });
      void handleFile(file);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-ink">Analyse your statement</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Upload a Revolut export to see spending, recurring charges and what could
          be trimmed.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={`card flex flex-col items-center justify-center gap-3 border-2 border-dashed py-14 text-center transition-colors ${
          dragging ? 'border-accent bg-accent-soft/40' : 'border-line'
        }`}
      >
        <UploadIcon className="h-8 w-8 text-ink-faint" />
        <div className="text-sm text-ink-soft">
          Drag a CSV or PDF here, or
        </div>
        <button
          className="btn btn-primary"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <FileText className="h-4 w-4" />
          {busy ? 'Reading…' : 'Choose file'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,.pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
        <button className="mt-1 text-xs font-medium text-accent underline" onClick={loadSample}>
          or try it with synthetic sample data
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 flex items-start gap-2 rounded-lg border border-line bg-white p-4 text-sm text-ink-soft">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <span className="font-medium text-ink">Everything stays on your device.</span>{' '}
          The file is parsed in your browser. No data is uploaded, no account is needed.
          For best results, export from Revolut as <strong>CSV</strong> (Statements →
          Excel/CSV) rather than PDF.
        </div>
      </div>
    </div>
  );
}
