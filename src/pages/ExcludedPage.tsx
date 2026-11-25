import { SpanishWord } from '../components/SpanishWord';
import { WordRowActions, WordRowEditor } from '../components/vocabulary/WordRowParts';
import { useWords } from '../context/words';
import { useToast } from '../context/toasts';
import { useWordRow } from '../hooks/useWordRow';
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

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Excluded</h1>
          <p>Words you've taken out of practice. Returning them keeps their learning progress.</p>
        </div>
      </div>
      <div className="card">
        {excludedWords.length ? (
          <div className="word-list">
            <div className="word-row excluded-row word-row-head" aria-hidden="true">
              <span>Spanish</span>
              <span>English</span>
              <span />
            </div>
            {excludedWords.map((word) => <ExcludedRow key={word.id} word={word} onGoToDrafts={onGoToDrafts} />)}
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
