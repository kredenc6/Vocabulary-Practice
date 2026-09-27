import { LANGUAGE_NAMES, promptSide, promptText } from '../../lib/practice';
import type { PracticeCard } from '../../types';

/** The word being asked, with its language label. */
export function CardPrompt({ card }: { card: PracticeCard }) {
  return (
    <div className="prompt">
      <div className="prompt-lang">{LANGUAGE_NAMES[promptSide(card.direction)]}</div>
      <div className="prompt-word" lang={card.direction === 'es-en' ? 'es' : 'en'}>
        {promptText(card)}
      </div>
    </div>
  );
}
