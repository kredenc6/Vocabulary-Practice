import { useRef, useState } from 'react';
import { useWords } from '../../context/words';
import { pairKey } from '../../lib/csv';
import { EMPTY_WORD_FORM, formToWordInput } from '../../lib/wordForm';
import type { WordFormValues } from '../../lib/wordForm';
import { isComplete } from '../../lib/wordValidation';
import { WordForm } from './WordForm';

export function AddWordForm() {
  const { words, addWord } = useWords();
  const [values, setValues] = useState<WordFormValues>(EMPTY_WORD_FORM);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const spanishRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const input = formToWordInput(values);
    const label = input.english ? `${input.spanish} – ${input.english}` : input.spanish;

    const key = pairKey(input);
    if (words.some((w) => pairKey(w) === key)) {
      setMessage({ type: 'error', text: `"${label}" is already in your vocabulary.` });
      return;
    }

    setValues(EMPTY_WORD_FORM);
    setMessage(null);
    spanishRef.current?.focus();
    try {
      await addWord(input);
      setMessage({
        type: 'success',
        text: isComplete(input) ? `Added "${label}".` : `Saved "${label}" to drafts.`,
      });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Could not save the word. Please try again.' });
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
      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginTop: '0.75rem' }} role="status">
          {message.text}
        </div>
      )}
    </div>
  );
}
