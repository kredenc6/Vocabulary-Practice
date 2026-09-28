import { LANGUAGE_NAMES, promptSide } from '../../lib/practice';
import { WordSide } from '../SpanishWord';
import type { PracticeCard } from '../../types';

/** The word being asked, with its language label. */
export function CardPrompt({ card }: { card: PracticeCard }) {
  return (
    <div className="prompt">
      <div className="prompt-lang">{LANGUAGE_NAMES[promptSide(card.direction)]}</div>
      {/* The plural only shows with a Spanish prompt, never before an English → Spanish answer. */}
      <div className="prompt-word">
        <WordSide word={card.word} side={promptSide(card.direction)} />
      </div>
    </div>
  );
}
