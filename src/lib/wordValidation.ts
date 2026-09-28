/**
 * Draft rule (see docs/word-model.md). A word is complete when:
 * - `spanish` and `english` are non-empty after trimming,
 * - `type` is set,
 * - and, if `type` is "noun", `article` is set (`not_used` counts as set).
 * Anything else is a draft. The status is always derived, never stored.
 */
import type { VocabWordData } from '../types';

/** The fields the draft rule looks at. Works for stored words and form input alike. */
export type WordCompletenessFields = Pick<VocabWordData, 'spanish' | 'english' | 'type' | 'article'>;

export type MandatoryField = 'spanish' | 'english' | 'type' | 'article';

/** UI labels for missing-field hints. */
export const MANDATORY_FIELD_LABELS: Record<MandatoryField, string> = {
  spanish: 'Spanish word',
  english: 'English translation',
  type: 'type',
  article: 'article',
};

/** Mandatory fields that are missing, in a stable order. Empty for complete words. */
export function getMissingFields(word: WordCompletenessFields): MandatoryField[] {
  const missing: MandatoryField[] = [];
  if (!word.spanish.trim()) missing.push('spanish');
  if (!word.english.trim()) missing.push('english');
  if (!word.type) missing.push('type');
  if (word.type === 'noun' && !word.article) missing.push('article');
  return missing;
}

export function isComplete(word: WordCompletenessFields): boolean {
  return getMissingFields(word).length === 0;
}

export function isDraft(word: WordCompletenessFields): boolean {
  return !isComplete(word);
}
