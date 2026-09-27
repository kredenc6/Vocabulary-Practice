import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useWords } from '../../context/words';
import { parseVocabCsv, wordsToCsv } from '../../lib/csv';
import type { CsvImportPreview } from '../../lib/csv';

type Status =
  | { name: 'idle' }
  | { name: 'parsing' }
  | { name: 'preview'; fileName: string; preview: CsvImportPreview }
  | { name: 'importing'; count: number }
  | { name: 'done'; count: number }
  | { name: 'error'; message: string };

const PREVIEW_ROWS = 5;

function downloadCsv(content: string, fileName: string) {
  // Prepend a BOM so Excel opens UTF-8 accents (á, ñ) correctly.
  const blob = new Blob(['﻿', content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function CsvImport() {
  const { words, importPairs } = useWords();
  const [status, setStatus] = useState<Status>({ name: 'idle' });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setStatus({ name: 'parsing' });
    try {
      const preview = await parseVocabCsv(file, words);
      setStatus({ name: 'preview', fileName: file.name, preview });
    } catch (err) {
      setStatus({ name: 'error', message: err instanceof Error ? err.message : 'Could not read the file.' });
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
    const { pairs } = status.preview;
    setStatus({ name: 'importing', count: pairs.length });
    try {
      const count = await importPairs(pairs);
      setStatus({ name: 'done', count });
    } catch (err) {
      console.error(err);
      setStatus({ name: 'error', message: 'Import failed. Please try again.' });
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Import from CSV</h2>
        <p>Two columns: Spanish, English. A header row is optional.</p>
      </div>

      {status.name === 'preview' ? (
        <div className="stack">
          <p>
            <strong>{status.fileName}</strong>: {status.preview.pairs.length} new word
            {status.preview.pairs.length === 1 ? '' : 's'} to import
            {status.preview.duplicates > 0 && <>, {status.preview.duplicates} duplicates skipped</>}
            {status.preview.invalidRows > 0 && <>, {status.preview.invalidRows} invalid rows skipped</>}
            {status.preview.headerSkipped && <> (header row detected)</>}.
          </p>
          {status.preview.pairs.length > 0 && (
            <div className="table-wrap">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Spanish</th>
                    <th>English</th>
                  </tr>
                </thead>
                <tbody>
                  {status.preview.pairs.slice(0, PREVIEW_ROWS).map((p, i) => (
                    <tr key={i}>
                      <td lang="es">{p.spanish}</td>
                      <td>{p.english}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {status.preview.pairs.length > PREVIEW_ROWS && (
                <p className="small muted" style={{ marginTop: '0.35rem' }}>
                  …and {status.preview.pairs.length - PREVIEW_ROWS} more
                </p>
              )}
            </div>
          )}
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={confirmImport}
              disabled={status.preview.pairs.length === 0}
            >
              Import {status.preview.pairs.length} words
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
            {status.name === 'parsing' || status.name === 'importing' ? (
              <span>{status.name === 'parsing' ? 'Reading file…' : `Importing ${status.count} words…`}</span>
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
              Imported {status.count} word{status.count === 1 ? '' : 's'}.
            </div>
          )}
          {status.name === 'error' && (
            <div className="alert alert-error" role="alert">
              {status.message}
            </div>
          )}
          <div className="row row-between">
            <span className="small muted">Example row: <span className="code-inline">el perro,the dog</span></span>
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
