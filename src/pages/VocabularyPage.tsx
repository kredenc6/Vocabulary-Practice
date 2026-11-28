import { useMemo, useState } from 'react';
import { useWords } from '../context/words';
import { useToast } from '../context/toasts';
import { STATUS_LABELS, isDue, wordStatus } from '../lib/srs';
import { createWordSearch } from '../lib/wordSearch';
import type { VocabWord, WordStatus } from '../types';
import { AddWordForm } from '../components/vocabulary/AddWordForm';
import { CsvImport } from '../components/vocabulary/CsvImport';
import { WordRow } from '../components/vocabulary/WordRow';
import { WordSearchInput } from '../components/vocabulary/WordSearchInput';
import { WORD_TYPES, WORD_TYPE_LABELS, type WordType } from '../constants/word';

type StatusFilter = 'all' | 'due' | WordStatus;
type TypeFilter = 'all' | WordType;
type SortKey = 'newest' | 'spanish' | 'english' | 'due';

const PAGE_SIZE = 100;

const SORTERS: Record<SortKey, (a: VocabWord, b: VocabWord) => number> = {
  newest: (a, b) => b.createdAt - a.createdAt,
  spanish: (a, b) => a.spanish.localeCompare(b.spanish, 'es'),
  english: (a, b) => a.english.localeCompare(b.english, 'en'),
  due: (a, b) => a.nextReviewDate - b.nextReviewDate,
};

interface Props {
  onGoToDrafts: () => void;
  onGoToExcluded: () => void;
}

export function VocabularyPage({ onGoToDrafts, onGoToExcluded }: Props) {
  const { practiceWords: words, draftWords, excludedWords } = useWords();
  const draftCount = draftWords.length;
  const excludedCount = excludedWords.length;
  const notify = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const updateSearch = (value: string) => {
    setSearch(value);
    setVisible(PAGE_SIZE);
  };

  const now = Date.now();
  const filtered = useMemo(() => {
    const at = Date.now();
    const matchesSearch = createWordSearch(search);
    const result = words.filter((w) => {
      if (filter === 'due' && !isDue(w, at)) return false;
      if (filter !== 'all' && filter !== 'due' && wordStatus(w) !== filter) return false;
      if (typeFilter !== 'all' && w.type !== typeFilter) return false;
      return matchesSearch(w);
    });
    return result.sort(SORTERS[sort]);
  }, [words, search, filter, typeFilter, sort]);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Vocabulary</h1>
          <p>
            {words.length} word{words.length === 1 ? '' : 's'}
            {draftCount > 0 && (
              <>
                {' · '}
                <button type="button" className="link-btn" onClick={onGoToDrafts}>
                  {draftCount} draft{draftCount === 1 ? '' : 's'}
                </button>
              </>
            )}
            {excludedCount > 0 && (
              <>
                {' · '}
                <button type="button" className="link-btn" onClick={onGoToExcluded}>
                  {excludedCount} excluded
                </button>
              </>
            )}
            {' · synced to your account'}
          </p>
        </div>
      </div>

      <div className="grid-2">
        <AddWordForm onSpanishChange={updateSearch} />
        <CsvImport />
      </div>

      <div className="card">
        <div className="toolbar">
          <WordSearchInput
            value={search}
            onChange={updateSearch}
          />
          <select
            className="input"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as StatusFilter);
              setVisible(PAGE_SIZE);
            }}
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
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as TypeFilter);
              setVisible(PAGE_SIZE);
            }}
            aria-label="Filter by word type"
          >
            <option value="all">All types</option>
            {WORD_TYPES.map((type) => (
              <option key={type} value={type}>
                {WORD_TYPE_LABELS[type]}
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
            {words.length > 0 ? (
              <p>No words match your filters.</p>
            ) : excludedCount > 0 ? (
              <>
                <p>No words available for practice. You can return words from Excluded.</p>
                <button type="button" className="btn btn-secondary" onClick={onGoToExcluded}>
                  Open excluded words
                </button>
              </>
            ) : draftCount > 0 ? (
              <>
                <p>
                  No complete words yet. {draftCount} draft{draftCount === 1 ? ' is' : 's are'} waiting to be
                  completed.
                </p>
                <button type="button" className="btn btn-secondary" onClick={onGoToDrafts}>
                  Open drafts
                </button>
              </>
            ) : (
              <p>No words yet – add your first word above.</p>
            )}
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
              <WordRow key={w.id} word={w} now={now} onMovedToDrafts={(label) => notify({
                type: 'success', message: `Saved "${label}" to drafts.`,
                action: { label: 'Open drafts', onClick: onGoToDrafts },
              })} />
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
