import { useWordRow } from '../../hooks/useWordRow';
import { MISSING_FIELD_TAGS, getMissingFields } from '../../lib/wordValidation';
import type { VocabWord } from '../../types';
import { SpanishWord } from '../SpanishWord';
import { RowError, WordRowActions, WordRowEditor } from './WordRowParts';

/** A draft in the Drafts list: word, translation (if any) and what is missing. */
export function DraftRow({ word }: { word: VocabWord }) {
  const state = useWordRow(word);

  if (state.mode === 'edit') return <WordRowEditor word={word} state={state} />;

  return (
    <div className="word-row draft-row">
      <span className="word-text word-es">
        <SpanishWord word={word} />
      </span>
      <span className={`word-text word-en${word.english ? '' : ' muted'}`}>{word.english || '—'}</span>
      <span className="missing-tags" aria-label="Missing">
        {getMissingFields(word).map((field) => (
          <span key={field} className="tag-missing">
            {MISSING_FIELD_TAGS[field]}
          </span>
        ))}
      </span>
      <WordRowActions word={word} state={state} />
      <RowError error={state.error} />
    </div>
  );
}
