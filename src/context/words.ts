import { createContext, useContext } from 'react';
import type { AnswerOutcome, PracticeMode, SrsState, VocabWord, WordInput, WordUpdate } from '../types';

export interface WordsContextValue {
  /** All words of the signed-in user (drafts included), newest first. Kept in sync in real time. */
  words: VocabWord[];
  /**
   * Complete words only (see isComplete in lib/wordValidation). Practice and
   * statistics must use this list – drafts never reach them.
   */
  practiceWords: VocabWord[];
  /** Drafts only (the complement of practiceWords), newest first. */
  draftWords: VocabWord[];
  loading: boolean;
  error: string | null;
  addWord: (input: WordInput) => Promise<void>;
  updateWord: (id: string, changes: WordUpdate) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
  resetProgress: (id: string) => Promise<void>;
  importWords: (inputs: WordInput[]) => Promise<number>;
  recordReview: (word: VocabWord, outcome: AnswerOutcome, mode: PracticeMode) => SrsState;
}

export const WordsContext = createContext<WordsContextValue | null>(null);

export function useWords(): WordsContextValue {
  const ctx = useContext(WordsContext);
  if (!ctx) throw new Error('useWords must be used inside <WordsProvider>');
  return ctx;
}
