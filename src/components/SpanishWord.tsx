import { formatSpanish } from '../lib/wordDisplay';
import type { VocabWordData } from '../types';

type DisplayWord = Pick<VocabWordData, 'spanish' | 'article' | 'plural' | 'english'>;

/**
 * The formatted Spanish word ("un hombre") with its plural as small muted text.
 * Only use it where the Spanish word itself may be visible; the plural is
 * display-only (never graded, never an answer option).
 */
export function SpanishWord({ word, showPlural = true }: { word: DisplayWord; showPlural?: boolean }) {
  return (
    <>
      <span lang="es">{formatSpanish(word)}</span>
      {showPlural && word.plural && (
        <>
          {' '}
          <span className="plural" lang="es">
            pl. {word.plural}
          </span>
        </>
      )}
    </>
  );
}

/**
 * One side of a word in practice: the Spanish side (with plural) or the English
 * translation. The plural therefore only ever appears together with the Spanish word.
 */
export function WordSide({ word, side }: { word: DisplayWord; side: 'spanish' | 'english' }) {
  return side === 'spanish' ? <SpanishWord word={word} /> : <span lang="en">{word.english}</span>;
}
