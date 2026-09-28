import { useState } from 'react';
import { useWords } from '../context/words';
import { formToWordUpdate, wordToFormValues } from '../lib/wordForm';
import type { WordFormValues } from '../lib/wordForm';
import type { VocabWord } from '../types';

export type WordRowMode = 'view' | 'edit' | 'confirm-delete';

export interface WordRowState {
  mode: WordRowMode;
  setMode: (mode: WordRowMode) => void;
  values: WordFormValues;
  setValues: (values: WordFormValues) => void;
  error: string | null;
  startEdit: () => void;
  save: () => Promise<void>;
  remove: () => Promise<void>;
  resetProgress: () => void;
}

/** Edit/delete state shared by the vocabulary list and the drafts list. */
export function useWordRow(word: VocabWord): WordRowState {
  const { updateWord, deleteWord, resetProgress } = useWords();
  const [mode, setMode] = useState<WordRowMode>('view');
  const [values, setValues] = useState<WordFormValues>(() => wordToFormValues(word));
  const [error, setError] = useState<string | null>(null);

  return {
    mode,
    setMode,
    values,
    setValues,
    error,
    startEdit() {
      setValues(wordToFormValues(word));
      setError(null);
      setMode('edit');
    },
    // An incomplete word simply stays (or becomes) a draft – the status is derived,
    // so the row moves between the vocabulary list and Drafts by itself.
    async save() {
      try {
        await updateWord(word.id, formToWordUpdate(values));
        setMode('view');
      } catch (err) {
        console.error(err);
        setError('Could not save changes.');
      }
    },
    async remove() {
      try {
        await deleteWord(word.id);
      } catch (err) {
        console.error(err);
        setError('Could not delete the word.');
        setMode('view');
      }
    },
    resetProgress() {
      void resetProgress(word.id);
      setMode('view');
    },
  };
}
