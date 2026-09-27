import { useState } from 'react';
import { useHotkeys } from '../../hooks/useHotkeys';
import { answerText } from '../../lib/practice';
import type { AnswerOutcome, PracticeCard } from '../../types';
import { CardPrompt } from './CardPrompt';

interface Props {
  card: PracticeCard;
  active: boolean;
  onAnswer: (outcome: AnswerOutcome, userAnswer: string) => void;
}

/** Show a word with 4 options, exactly one of which is correct. */
export function MultipleChoiceView({ card, active, onAnswer }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = card.options ?? [];
  const correct = answerText(card);

  const choose = (option: string) => {
    if (selected !== null) return;
    setSelected(option);
    onAnswer(option === correct ? 'correct' : 'incorrect', option);
  };

  useHotkeys(active && selected === null, (event) => {
    const n = Number(event.key);
    if (n >= 1 && n <= options.length) choose(options[n - 1]);
  });

  const optionClass = (option: string) => {
    if (selected === null) return 'mc-option';
    if (option === correct) return 'mc-option is-correct';
    if (option === selected) return 'mc-option is-wrong';
    return 'mc-option is-dimmed';
  };

  return (
    <div className="stack">
      <div className="card">
        <CardPrompt card={card} />
      </div>
      <div className="mc-options">
        {options.map((option, i) => (
          <button
            key={option}
            type="button"
            className={optionClass(option)}
            onClick={() => choose(option)}
            disabled={selected !== null}
          >
            <kbd>{i + 1}</kbd>
            <span>{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
