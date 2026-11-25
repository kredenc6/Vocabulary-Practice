import { useState } from 'react';
import { useWords } from '../context/words';
import { useToast } from '../context/toasts';
import { pairKey } from '../lib/csv';
import { completeWordTab } from '../lib/wordDisplay';
import { formToWordInput, formToWordUpdate, wordLabel, wordToFormValues } from '../lib/wordForm';
import { isComplete } from '../lib/wordValidation';
import type { WordFormValues } from '../lib/wordForm';
import type { VocabWord } from '../types';

export type WordRowMode = 'view' | 'edit' | 'confirm-delete' | 'confirm-reset';

export interface WordRowState {
  mode: WordRowMode;
  setMode: (mode: WordRowMode) => void;
  values: WordFormValues;
  setValues: (values: WordFormValues) => void;
  startEdit: () => void;
  save: () => Promise<void>;
  togglePracticeExclusion: () => Promise<void>;
  changingPracticeExclusion: boolean;
  remove: () => Promise<void>;
  resetProgress: () => void;
}

export interface WordRowOptions {
  /**
   * Called after a complete word was saved as a draft so the page can offer
   * an Open drafts action.
   */
  onMovedToDrafts?: (label: string) => void;
}

/** Actions shared by the word lists. */
export function useWordRow(word: VocabWord, { onMovedToDrafts }: WordRowOptions = {}): WordRowState {
  const { completeWords, updateWord, deleteWord, resetProgress } = useWords();
  const [mode, setMode] = useState<WordRowMode>('view');
  const [values, setValues] = useState<WordFormValues>(() => wordToFormValues(word));
  const [changingPracticeExclusion, setChangingPracticeExclusion] = useState(false);
  const notify = useToast();

  return {
    mode,
    setMode,
    values,
    setValues,
    changingPracticeExclusion,
    startEdit() {
      setValues(wordToFormValues(word));
      setMode('edit');
    },
    async save() {
      // Block duplicate Spanish/English pairs for edits.
      const input = formToWordInput(values);
      const key = pairKey(input);
      const duplicate = completeWords.find((w) => w.id !== word.id && pairKey(w) === key);
      if (duplicate) {
        notify({ type: 'error', message: `"${wordLabel(input)}" is already in the ${completeWordTab(duplicate)} tab.` });
        return;
      }

      const complete = isComplete(input);
      const editingDraft = !isComplete(word);
      const becomesDraft = !editingDraft && !complete;
      const label = wordLabel(input);
      try {
        await updateWord(word.id, formToWordUpdate(values, editingDraft));
        setMode('view');
        if (becomesDraft && onMovedToDrafts) {
          onMovedToDrafts(label);
        } else {
          notify({
            type: 'success',
            message: editingDraft && input.excludedFromPractice
              ? `Saved "${label}" to Excluded.`
              : complete ? `Saved "${label}".` : `Saved "${label}" to drafts.`,
          });
        }
      } catch (err) {
        console.error(err);
        notify({ type: 'error', message: 'Could not save changes.' });
      }
    },
    async togglePracticeExclusion() {
      if (!isComplete(word) || changingPracticeExclusion) return;
      const excludedFromPractice = !word.excludedFromPractice;
      const label = wordLabel(word);
      setChangingPracticeExclusion(true);
      try {
        await updateWord(word.id, { excludedFromPractice });
        notify({
          type: 'success',
          message: excludedFromPractice ? `Excluded "${label}" from practice.` : `Returned "${label}" to practice.`,
        });
      } catch (err) {
        console.error(err);
        notify({ type: 'error', message: 'Could not change the word’s practice status.' });
      } finally {
        setChangingPracticeExclusion(false);
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
