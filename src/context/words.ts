import { createContext, useContext } from 'react';
import type { AnswerOutcome, PracticeMode, SrsState, VocabWord, WordPairInput } from '../types';

export interface WordsContextValue {
  /** All words of the signed-in user, newest first. Kept in sync in real time. */
  words: VocabWord[];
  loading: boolean;
  error: string | null;
  addWord: (pair: WordPairInput) => Promise<void>;
  updateWord: (id: string, pair: WordPairInput) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
  resetProgress: (id: string) => Promise<void>;
  importPairs: (pairs: WordPairInput[]) => Promise<number>;
  recordReview: (word: VocabWord, outcome: AnswerOutcome, mode: PracticeMode) => SrsState;
}

export const WordsContext = createContext<WordsContextValue | null>(null);

export function useWords(): WordsContextValue {
  const ctx = useContext(WordsContext);
  if (!ctx) throw new Error('useWords must be used inside <WordsProvider>');
  return ctx;
}
