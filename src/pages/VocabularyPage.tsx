import { useMemo, useState } from 'react';
import { useWords } from '../context/words';
import { normalize, stripAccents } from '../lib/answerCheck';
import { STATUS_LABELS, isDue, wordStatus } from '../lib/srs';
import type { VocabWord, WordStatus } from '../types';
import { AddWordForm } from '../components/vocabulary/AddWordForm';
import { CsvImport } from '../components/vocabulary/CsvImport';
import { WordRow } from '../components/vocabulary/WordRow';

type StatusFilter = 'all' | 'due' | WordStatus;
type SortKey = 'newest' | 'spanish' | 'english' | 'due';

const PAGE_SIZE = 100;

const SORTERS: Record<SortKey, (a: VocabWord, b: VocabWord) => number> = {
  newest: (a, b) => b.createdAt - a.createdAt,
  spanish: (a, b) => a.spanish.localeCompare(b.spanish, 'es'),
  english: (a, b) => a.english.localeCompare(b.english, 'en'),
  due: (a, b) => a.nextReviewDate - b.nextReviewDate,
};

const searchable = (text: string) => stripAccents(normalize(text));

export function VocabularyPage() {
  const { words } = useWords();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const now = Date.now();
  const filtered = useMemo(() => {
    const at = Date.now();
    const q = searchable(search);
    const result = words.filter((w) => {
      if (filter === 'due' && !isDue(w, at)) return false;
      if (filter !== 'all' && filter !== 'due' && wordStatus(w) !== filter) return false;
      return !q || searchable(w.spanish).includes(q) || searchable(w.english).includes(q);
    });
    return result.sort(SORTERS[sort]);
  }, [words, search, filter, sort]);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Vocabulary</h1>
          <p>
            {words.length} word{words.length === 1 ? '' : 's'} · synced to your account
          </p>
        </div>
      </div>

      <div className="grid-2">
        <AddWordForm />
        <CsvImport />
      </div>

      <div className="card">
        <div className="toolbar">
          <input
            className="input"
            type="search"
            placeholder="Search Spanish or English…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            aria-label="Search words"
          />
          <select
            className="input"
            value={filter}
            onChange={(e) => setFilter(e.target.value as StatusFilter)}
            aria-label="Filter by status"
          >
            <option value="all">All words</option>
            <option value="due">Due now</option>
            {(Object.keys(STATUS_LABELS) as WordStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort words"
          >
            <option value="newest">Newest first</option>
            <option value="spanish">Spanish A–Z</option>
            <option value="english">English A–Z</option>
            <option value="due">Next review</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>{words.length === 0 ? 'No words yet – add your first word above.' : 'No words match your filters.'}</p>
          </div>
        ) : (
          <div className="word-list">
            <div className="word-row word-row-head" aria-hidden="true">
              <span>Spanish</span>
              <span>English</span>
              <span>Status</span>
              <span>Next review</span>
              <span />
            </div>
            {filtered.slice(0, visible).map((w) => (
              <WordRow key={w.id} word={w} now={now} />
            ))}
          </div>
        )}

        {filtered.length > visible && (
          <div className="row" style={{ justifyContent: 'center', marginTop: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Show more ({filtered.length - visible} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
