import { useWords } from '../context/words';
import { DraftRow } from '../components/vocabulary/DraftRow';

interface Props {
  onGoToVocabulary: () => void;
}

/** Words that are missing mandatory fields (see docs/word-model.md). */
export function DraftsPage({ onGoToVocabulary }: Props) {
  const { draftWords } = useWords();

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
        {draftWords.length === 0 ? (
          <div className="empty-state">
            <div className="emoji" aria-hidden="true">
              ✅
            </div>
            <h2>No drafts</h2>
            <p>All your words are complete and ready to practice. Words you save with missing fields will show up here.</p>
            <button type="button" className="btn btn-secondary" onClick={onGoToVocabulary}>
              Go to vocabulary
            </button>
          </div>
        ) : (
          <div className="word-list">
            <div className="word-row draft-row word-row-head" aria-hidden="true">
              <span>Spanish</span>
              <span>English</span>
              <span>Missing</span>
              <span />
            </div>
            {draftWords.map((w) => (
              <DraftRow key={w.id} word={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
