import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { ARTICLE_LABELS, ARTICLES, WORD_TYPES } from '../../constants/word';
import { useWords } from '../../context/words';
import { CSV_DELIMITER, CSV_TEMPLATE, planCsvImport, readCsvFile, wordsToCsv } from '../../lib/csv';
import type { CsvImportPlan, CsvRowIssue } from '../../lib/csv';
import { formatSpanish } from '../../lib/wordDisplay';
import { isComplete } from '../../lib/wordValidation';
import { InfoPopover } from '../InfoPopover';

type Status =
  | { name: 'idle' }
  | { name: 'reading' }
  | { name: 'preview'; fileName: string; plan: CsvImportPlan }
  | { name: 'importing'; count: number }
  | { name: 'done'; fileName: string; plan: CsvImportPlan }
  | { name: 'error'; message: string };

const PREVIEW_ROWS = 5;

const EXAMPLE = [
  CSV_TEMPLATE,
  'hombre|man|noun|un|hombres',
  'maleta|suitcase|noun|una|maletas',
  'México|Mexico|noun|not used|',
  'hablar|to speak|verb||',
].join('\n');

function downloadCsv(content: string, fileName: string) {
  // Prepend a BOM so Excel opens UTF-8 accents (á, ñ) correctly; the import strips it.
  const blob = new Blob([String.fromCharCode(0xfeff), content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function FormatHelp() {
  return (
    <>
      <p>
        A <strong>UTF-8</strong> text file. Columns are separated by <strong>{CSV_DELIMITER}</strong> and the{' '}
        <strong>first line is a header</strong>:
      </p>
      <pre className="code-block">{CSV_TEMPLATE}</pre>
      <p>
        <strong>spanish</strong> and <strong>english</strong> columns are required; <strong>type</strong>,{' '}
        <strong>article</strong> and <strong>plural</strong> are optional. Columns can be in any order. Write the Spanish
        word without its article.
      </p>
      <p>Example:</p>
      <pre className="code-block">{EXAMPLE}</pre>
      <p>
        <strong>type</strong>: {WORD_TYPES.join(', ')}. <strong>article</strong> (nouns only):{' '}
        {ARTICLES.map((a) => ARTICLE_LABELS[a]).join(', ')}. <strong>plural</strong>: nouns only, without article.
      </p>
      <p>
        Rows without an English translation, a type, or a noun's article are imported as drafts. Words whose Spanish
        already exists are skipped.
      </p>
    </>
  );
}

function IssueList({ title, issues }: { title: string; issues: CsvRowIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <details open>
      <summary>
        {title} ({issues.length})
      </summary>
      <ul>
        {issues.map((issue, i) => (
          <li key={i}>
            Row {issue.row}: {issue.message}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Counts plus row-level details. Shown before importing (preview) and after (report). */
function ImportReport({ plan, done }: { plan: CsvImportPlan; done: boolean }) {
  const total = plan.words.length;
  return (
    <div className="import-report">
      <p>
        {done ? 'Imported' : 'Ready to import'} <strong>{total}</strong> word{total === 1 ? '' : 's'}:{' '}
        <strong>{plan.completeCount}</strong> complete, <strong>{plan.draftCount}</strong> as draft
        {plan.draftCount === 1 ? '' : 's'}.
      </p>
      {plan.warnings.map((warning) => (
        <div key={warning} className="alert alert-warn">
          {warning}
        </div>
      ))}
      <IssueList title="Skipped duplicates" issues={plan.duplicates} />
      <IssueList title="Errors – rows skipped" issues={plan.errors} />
      <IssueList title="Invalid values – imported without them" issues={plan.invalidValues} />
    </div>
  );
}

export function CsvImport() {
  const { words, importWords } = useWords();
  const [status, setStatus] = useState<Status>({ name: 'idle' });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Validation happens entirely in memory; nothing is written until "Import" is confirmed.
  const handleFile = async (file: File) => {
    setStatus({ name: 'reading' });
    try {
      const read = await readCsvFile(file);
      if (!read.ok) {
        setStatus({ name: 'error', message: read.error });
        return;
      }
      const result = planCsvImport(read.text, words);
      setStatus(result.ok ? { name: 'preview', fileName: file.name, plan: result.plan } : { name: 'error', message: result.error });
    } catch (err) {
      console.error(err);
      setStatus({ name: 'error', message: 'Could not read the file. Nothing was imported.' });
    }
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const confirmImport = async () => {
    if (status.name !== 'preview') return;
    const { plan, fileName } = status;
    setStatus({ name: 'importing', count: plan.words.length });
    try {
      await importWords(plan.words);
      setStatus({ name: 'done', fileName, plan });
    } catch (err) {
      console.error(err);
      setStatus({
        name: 'error',
        message: 'The import failed part-way. Some words may already be saved – check your vocabulary before trying again.',
      });
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Import from CSV</h2>
        <InfoPopover label="CSV import format">
          <FormatHelp />
        </InfoPopover>
      </div>
      <p className="small muted" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
        UTF-8, columns separated by “{CSV_DELIMITER}”, header row required (spanish{CSV_DELIMITER}english
        {CSV_DELIMITER}…).
      </p>

      {status.name === 'preview' ? (
        <div className="stack">
          <p className="small">
            <strong>{status.fileName}</strong>
          </p>
          <ImportReport plan={status.plan} done={false} />
          {status.plan.words.length > 0 && (
            <div className="table-wrap">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Spanish</th>
                    <th>English</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {status.plan.words.slice(0, PREVIEW_ROWS).map((w, i) => (
                    <tr key={i}>
                      <td lang="es">{formatSpanish(w)}</td>
                      <td>{w.english || '—'}</td>
                      <td>{w.type ?? '—'}</td>
                      <td>{isComplete(w) ? 'Complete' : 'Draft'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {status.plan.words.length > PREVIEW_ROWS && (
                <p className="small muted" style={{ marginTop: '0.35rem' }}>
                  …and {status.plan.words.length - PREVIEW_ROWS} more
                </p>
              )}
            </div>
          )}
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={confirmImport}
              disabled={status.plan.words.length === 0}
            >
              Import {status.plan.words.length} word{status.plan.words.length === 1 ? '' : 's'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setStatus({ name: 'idle' })}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <div
            className={`dropzone${dragOver ? ' drag-over' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            {status.name === 'reading' || status.name === 'importing' ? (
              <span>{status.name === 'reading' ? 'Reading file…' : `Importing ${status.count} words…`}</span>
            ) : (
              <span>
                📄 Drop a <strong>.csv</strong> file here or <u>browse</u>
              </span>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={onInputChange}
            hidden
          />
          {status.name === 'done' && (
            <div className="alert alert-success" role="status">
              <p style={{ marginBottom: '0.35rem' }}>
                <strong>{status.fileName}</strong>
              </p>
              <ImportReport plan={status.plan} done />
            </div>
          )}
          {status.name === 'error' && (
            <div className="alert alert-error" role="alert">
              {status.message}
            </div>
          )}
          <div className="row row-between">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => downloadCsv(`${CSV_TEMPLATE}\n`, 'vocabulary-template.csv')}
            >
              Download template
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={words.length === 0}
              onClick={() => downloadCsv(wordsToCsv(words), 'vocabulary.csv')}
            >
              Export CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
