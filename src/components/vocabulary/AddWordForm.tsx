import { useRef, useState } from 'react';
import { useWords } from '../../context/words';
import { useToast } from '../../context/toasts';
import { duplicateWordMessage, findDuplicateWord } from '../../lib/wordDuplicates';
import { EMPTY_WORD_FORM, formToWordInput, wordLabel } from '../../lib/wordForm';
import type { WordFormValues } from '../../lib/wordForm';
import { isComplete } from '../../lib/wordValidation';
import { WordForm } from './WordForm';

interface Props {
  onSpanishChange?: (spanish: string) => void;
}

export function AddWordForm({ onSpanishChange }: Props) {
  const { completeWords, addWord } = useWords();
  const [values, setValues] = useState<WordFormValues>(EMPTY_WORD_FORM);
  const notify = useToast();
  const spanishRef = useRef<HTMLInputElement>(null);

  const handleChange = (next: WordFormValues) => {
    setValues(next);
    if (next.spanish !== values.spanish) {
      onSpanishChange?.(next.spanish);
    }
  };

  const handleSubmit = async () => {
    const input = formToWordInput(values);
    const label = wordLabel(input);

    const duplicate = findDuplicateWord(input, completeWords);
    if (duplicate) {
      notify({ type: 'error', message: duplicateWordMessage(input, duplicate) });
      return;
    }

    setValues(EMPTY_WORD_FORM);
    onSpanishChange?.('');
    spanishRef.current?.focus();
    try {
      await addWord(input);
      notify({
        type: 'success',
        message: input.excludedFromPractice
          ? `Added "${label}" to Excluded.`
          : isComplete(input) ? `Added "${label}".` : `Saved "${label}" to drafts.`,
      });
    } catch (err) {
      console.error(err);
      notify({ type: 'error', message: 'Could not save the word. Please try again.' });
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Add a word</h2>
        <p>Separate alternative translations with “/”, e.g. “car / automobile”.</p>
      </div>
      <WordForm
        values={values}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitLabels={{ complete: 'Add word', draft: 'Add to drafts' }}
        allowExclusion
        spanishRef={spanishRef}
      />
    </div>
  );
}
