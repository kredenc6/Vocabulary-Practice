import type { VocabWordData } from '../types';

/**
 * The Spanish word as shown to (and typed by) the learner: article + word,
 * e.g. "un hombre", "una maleta". Just the word when the article is absent
 * or `not_used` (e.g. "México"). See docs/word-model.md.
 */
export function formatSpanish(word: Pick<VocabWordData, 'spanish' | 'article'>): string {
  const spanish = word.spanish.trim();
  return word.article && word.article !== 'not_used' ? `${word.article} ${spanish}` : spanish;
}
