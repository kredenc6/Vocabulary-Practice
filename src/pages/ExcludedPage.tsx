import { useMemo, useState } from 'react';
import { SpanishWord } from '../components/SpanishWord';
import { WordRowActions, WordRowEditor } from '../components/vocabulary/WordRowParts';
import { WordSearchInput } from '../components/vocabulary/WordSearchInput';
import { useWords } from '../context/words';
import { useToast } from '../context/toasts';
import { useWordRow } from '../hooks/useWordRow';
import { createWordSearch } from '../lib/wordSearch';
import type { VocabWord } from '../types';

interface Props {
  onGoToVocabulary: () => void;
  onGoToDrafts: () => void;
}

function ExcludedRow({ word, onGoToDrafts }: { word: VocabWord; onGoToDrafts: () => void }) {
  const notify = useToast();
  const state = useWordRow(word, {
    onMovedToDrafts: (label) => notify({
      type: 'success',
      message: `Saved "${label}" to drafts.`,
      action: { label: 'Open drafts', onClick: onGoToDrafts },
    }),
  });
  if (state.mode === 'edit') return <WordRowEditor word={word} state={state} />;

  return (
    <div className="word-row excluded-row">
      <span className="word-text word-es"><SpanishWord word={word} /></span>
      <span className="word-text word-en">{word.english}</span>
      <WordRowActions word={word} state={state} />
    </div>
  );
}

export function ExcludedPage({ onGoToVocabulary, onGoToDrafts }: Props) {
  const { excludedWords } = useWords();
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => excludedWords.filter(createWordSearch(search)), [excludedWords, search]);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Excluded</h1>
          <p>Words you've taken out of practice. Returning them keeps their learning progress.</p>
        </div>
      </div>
      <div className="card">
        <div className="toolbar">
          <WordSearchInput value={search} onChange={setSearch} />
        </div>
        {filtered.length > 0 ? (
          <div className="word-list">
            <div className="word-row excluded-row word-row-head" aria-hidden="true">
              <span>Spanish</span>
              <span>English</span>
              <span />
            </div>
            {filtered.map((word) => <ExcludedRow key={word.id} word={word} onGoToDrafts={onGoToDrafts} />)}
          </div>
        ) : excludedWords.length > 0 ? (
          <div className="empty-state">
            <p>No words match your search.</p>
          </div>
        ) : (
          <div className="empty-state">
            <h2>No excluded words</h2>
            <p>Use “Exclude from practice” on a word in Vocabulary to move it here.</p>
            <button type="button" className="btn btn-secondary" onClick={onGoToVocabulary}>
              Go to vocabulary
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
