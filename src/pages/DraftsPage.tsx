import { useMemo, useState } from 'react';
import { useWords } from '../context/words';
import { createWordSearch } from '../lib/wordSearch';
import { DraftRow } from '../components/vocabulary/DraftRow';
import { WordSearchInput } from '../components/vocabulary/WordSearchInput';

interface Props {
  onGoToVocabulary: () => void;
}

/** Words that are missing mandatory fields (see docs/word-model.md). */
export function DraftsPage({ onGoToVocabulary }: Props) {
  const { draftWords } = useWords();
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => draftWords.filter(createWordSearch(search)), [draftWords, search]);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Drafts</h1>
          <p>
            Words missing a translation, type or article. They're kept out of practice and statistics until
            they're complete.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <WordSearchInput value={search} onChange={setSearch} />
        </div>
        {filtered.length > 0 ? (
          <div className="word-list">
            <div className="word-row draft-row word-row-head" aria-hidden="true">
              <span>Spanish</span>
              <span>English</span>
              <span>Missing</span>
              <span />
            </div>
            {filtered.map((w) => (
              <DraftRow key={w.id} word={w} />
            ))}
          </div>
        ) : draftWords.length > 0 ? (
          <div className="empty-state">
            <p>No drafts match your search.</p>
          </div>
        ) : (
          <div className="empty-state">
            <div className="emoji" aria-hidden="true">
              ✅
            </div>
            <h2>No drafts</h2>
            <p>Words you save with missing fields will show up here.</p>
            <button type="button" className="btn btn-secondary" onClick={onGoToVocabulary}>
              Go to vocabulary
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
