import { useState } from 'react';
import { useWords } from '../context/words';
import { useToast } from '../context/toasts';
import { pairKey } from '../lib/csv';
import { formCompletenessFields, formToWordInput, formToWordUpdate, wordLabel, wordToFormValues } from '../lib/wordForm';
import { isComplete } from '../lib/wordValidation';
import type { WordFormValues } from '../lib/wordForm';
import type { VocabWord } from '../types';

export type WordRowMode = 'view' | 'edit' | 'confirm-delete';

export interface WordRowState {
  mode: WordRowMode;
  setMode: (mode: WordRowMode) => void;
  values: WordFormValues;
  setValues: (values: WordFormValues) => void;
  startEdit: () => void;
  save: () => Promise<void>;
  remove: () => Promise<void>;
  resetProgress: () => void;
}

export interface WordRowOptions {
  /**
   * Called after a complete word was saved as a draft. Its row leaves the
   * vocabulary list at that point, so the page can offer an Open drafts action.
   */
  onMovedToDrafts?: (label: string) => void;
}

/** Edit/delete state shared by the vocabulary list and the drafts list. */
export function useWordRow(word: VocabWord, { onMovedToDrafts }: WordRowOptions = {}): WordRowState {
  const { practiceWords, updateWord, deleteWord, resetProgress } = useWords();
  const [mode, setMode] = useState<WordRowMode>('view');
  const [values, setValues] = useState<WordFormValues>(() => wordToFormValues(word));
  const notify = useToast();

  return {
    mode,
    setMode,
    values,
    setValues,
    startEdit() {
      setValues(wordToFormValues(word));
      setMode('edit');
    },
    // An incomplete word simply stays (or becomes) a draft – the status is derived,
    // so the row moves between the vocabulary list and Drafts by itself.
    async save() {
      // Block duplicate Spanish/English pairs for edits.
      const input = formToWordInput(values);
      const key = pairKey(input);
      if (practiceWords.some((w) => w.id !== word.id && pairKey(w) === key)) {
        notify({ type: 'error', message: `"${wordLabel(input)}" is already in your vocabulary.` });
        return;
      }

      const becomesDraft = isComplete(word) && !isComplete(formCompletenessFields(values));
      try {
        await updateWord(word.id, formToWordUpdate(values));
        setMode('view');
        if (becomesDraft && onMovedToDrafts) {
          onMovedToDrafts(wordLabel(input));
        } else {
          notify({
            type: 'success',
            message: isComplete(input) ? `Saved "${wordLabel(input)}".` : `Saved "${wordLabel(input)}" to drafts.`,
          });
        }
      } catch (err) {
        console.error(err);
        notify({ type: 'error', message: 'Could not save changes.' });
      }
    },
    async remove() {
      try {
        await deleteWord(word.id);
        notify({ type: 'success', message: `Deleted "${wordLabel(word)}".` });
      } catch (err) {
        console.error(err);
        notify({ type: 'error', message: 'Could not delete the word.' });
        setMode('view');
      }
    },
    resetProgress() {
      void resetProgress(word.id).then(
        () => notify({ type: 'success', message: `Reset progress for "${wordLabel(word)}".` }),
        () => notify({ type: 'error', message: 'Could not reset learning progress.' }),
      );
      setMode('view');
    },
  };
}
