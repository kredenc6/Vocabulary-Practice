import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as repo from '../services/wordsRepo';
import { isComplete, isDraft } from '../lib/wordValidation';
import type { VocabWord } from '../types';
import { WordsContext } from './words';
import type { WordsContextValue } from './words';

/**
 * Subscribes once to the user's words and shares them with the whole app.
 * Render with `key={uid}` so state resets when the user changes.
 */
export function WordsProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return repo.subscribeWords(
      uid,
      (next) => {
        setWords(next);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Could not load your vocabulary. Check your connection and Firestore rules.');
        setLoading(false);
      },
    );
  }, [uid]);

  // The single place where drafts are filtered out of practice and statistics.
  const practiceWords = useMemo(() => words.filter(isComplete), [words]);
  const draftWords = useMemo(() => words.filter(isDraft), [words]);

  const value = useMemo<WordsContextValue>(
    () => ({
      words,
      practiceWords,
      draftWords,
      loading,
      error,
      addWord: (input) => repo.addWord(uid, input),
      updateWord: (id, changes) => repo.updateWord(uid, id, changes),
      deleteWord: (id) => repo.deleteWord(uid, id),
      resetProgress: (id) => repo.resetWordProgress(uid, id),
      importPairs: (pairs) => repo.importWords(uid, pairs),
      recordReview: (word, outcome, mode) => repo.recordReview(uid, word, outcome, mode),
    }),
    [uid, words, practiceWords, draftWords, loading, error],
  );

  return <WordsContext.Provider value={value}>{children}</WordsContext.Provider>;
}
