/**
 * Word model constants – the single source of truth for word types and
 * articles. firestore.rules repeats these lists; keep both in sync.
 * See docs/word-model.md.
 */

/** Written to every word document on every write. */
export const WORD_SCHEMA_VERSION = 1;

export const WORD_TYPES = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'interjection',
  'phrase',
] as const;

export type WordType = (typeof WORD_TYPES)[number];

/** `not_used` = a noun used without an article (different from "not filled in"). */
export const ARTICLES = ['un', 'una', 'el', 'la', 'not_used'] as const;

export type Article = (typeof ARTICLES)[number];

export const WORD_TYPE_LABELS: Record<WordType, string> = {
  noun: 'noun',
  verb: 'verb',
  adjective: 'adjective',
  adverb: 'adverb',
  pronoun: 'pronoun',
  preposition: 'preposition',
  conjunction: 'conjunction',
  interjection: 'interjection',
  phrase: 'phrase',
};

export const ARTICLE_LABELS: Record<Article, string> = {
  un: 'un',
  una: 'una',
  el: 'el',
  la: 'la',
  not_used: 'not used',
};

export function isWordType(value: unknown): value is WordType {
  return typeof value === 'string' && (WORD_TYPES as readonly string[]).includes(value);
}

export function isArticle(value: unknown): value is Article {
  return typeof value === 'string' && (ARTICLES as readonly string[]).includes(value);
}
