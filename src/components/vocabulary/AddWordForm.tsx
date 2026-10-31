import { useRef, useState } from 'react';
import { useWords } from '../../context/words';
import { useToast } from '../../context/toasts';
import { pairKey } from '../../lib/csv';
import { EMPTY_WORD_FORM, formToWordInput, wordLabel } from '../../lib/wordForm';
import type { WordFormValues } from '../../lib/wordForm';
import { isComplete } from '../../lib/wordValidation';
import { WordForm } from './WordForm';

export function AddWordForm() {
  const { practiceWords, addWord } = useWords();
  const [values, setValues] = useState<WordFormValues>(EMPTY_WORD_FORM);
  const notify = useToast();
  const spanishRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const input = formToWordInput(values);
    const label = wordLabel(input);

    const key = pairKey(input);
    if (practiceWords.some((w) => pairKey(w) === key)) {
      notify({ type: 'error', message: `"${label}" is already in your vocabulary.` });
      return;
    }

    setValues(EMPTY_WORD_FORM);
    spanishRef.current?.focus();
    try {
      await addWord(input);
      notify({
        type: 'success',
        message: isComplete(input) ? `Added "${label}".` : `Saved "${label}" to drafts.`,
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
        onChange={setValues}
        onSubmit={handleSubmit}
        submitLabels={{ complete: 'Add word', draft: 'Add to drafts' }}
        spanishRef={spanishRef}
      />
    </div>
  );
}
