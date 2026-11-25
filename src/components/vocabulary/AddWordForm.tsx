import { useRef, useState } from 'react';
import { useWords } from '../../context/words';
import { useToast } from '../../context/toasts';
import { pairKey } from '../../lib/csv';
import { completeWordTab } from '../../lib/wordDisplay';
import { EMPTY_WORD_FORM, formToWordInput, wordLabel } from '../../lib/wordForm';
import type { WordFormValues } from '../../lib/wordForm';
import { isComplete } from '../../lib/wordValidation';
import { WordForm } from './WordForm';

export function AddWordForm() {
  const { completeWords, addWord } = useWords();
  const [values, setValues] = useState<WordFormValues>(EMPTY_WORD_FORM);
  const notify = useToast();
  const spanishRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const input = formToWordInput(values);
    const label = wordLabel(input);

    const key = pairKey(input);
    const duplicate = completeWords.find((w) => pairKey(w) === key);
    if (duplicate) {
      notify({ type: 'error', message: `"${label}" is already in the ${completeWordTab(duplicate)} tab.` });
      return;
    }

    setValues(EMPTY_WORD_FORM);
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
        onChange={setValues}
        onSubmit={handleSubmit}
        submitLabels={{ complete: 'Add word', draft: 'Add to drafts' }}
        allowExclusion
        spanishRef={spanishRef}
      />
    </div>
  );
}
