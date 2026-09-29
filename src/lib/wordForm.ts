/**
 * Form values for adding/editing a word and their conversion to the stored
 * model (see docs/word-model.md). Article and plural only apply to nouns;
 * conjugations only apply to verbs; adjective forms only apply to adjectives.
 */
import type { Conjugations } from '../constants/conjugation';
import type { Article, WordType } from '../constants/word';
import { cleanConjugations } from './conjugations';
import { adjectiveToFormState, cleanAdjective } from './adjective';
import type { AdjectiveFormState } from './adjective';
import type { VocabWordData, WordInput, WordUpdate } from '../types';
import type { WordCompletenessFields } from './wordValidation';
import { formatSpanish } from './wordDisplay';

/** Raw form state; `''` means "not selected / not filled in". */
export interface WordFormValues {
  spanish: string;
  english: string;
  type: WordType | '';
  article: Article | '';
  plural: string;
  /** Raw editor state (may contain empty strings); cleaned on save. */
  conjugations: Conjugations;
  /** Four-form / two-form choice and all form inputs; only the chosen kind is saved. */
  adjective: AdjectiveFormState;
}

export const EMPTY_WORD_FORM: WordFormValues = {
  spanish: '',
  english: '',
  type: '',
  article: '',
  plural: '',
  conjugations: {},
  adjective: adjectiveToFormState(),
};

export function wordToFormValues(word: VocabWordData): WordFormValues {
  return {
    spanish: word.spanish,
    english: word.english,
    type: word.type ?? '',
    article: word.article ?? '',
    plural: word.plural ?? '',
    conjugations: word.conjugations ?? {},
    adjective: adjectiveToFormState(word.adjective),
  };
}

/** Short display label used in messages, e.g. "la casa – house" or just "casa". */
export function wordLabel(word: WordInput): string {
  const spanish = formatSpanish(word);
  const english = word.english.trim();
  return english ? `${spanish} – ${english}` : spanish;
}

export function nounFieldsApply(type: WordType | ''): boolean {
  return type === 'noun';
}

export function verbFieldsApply(type: WordType | ''): boolean {
  return type === 'verb';
}

export function adjectiveFieldsApply(type: WordType | ''): boolean {
  return type === 'adjective';
}

/**
 * Change the type; article and plural are dropped when the type is no longer a noun.
 * Conjugations and adjective forms are kept in the form (so a mis-click doesn't lose
 * them) but are only saved while the type is verb / adjective.
 */
export function withType(values: WordFormValues, type: WordType | ''): WordFormValues {
  return nounFieldsApply(type) ? { ...values, type } : { ...values, type, article: '', plural: '' };
}

/** An article written before a noun: un/una/el/la, a space, then at least one more character. */
const LEADING_ARTICLE = /^\s*(un|una|el|la)\s+(?=\S)/i;

/**
 * "la casa" → { article: 'la', rest: 'casa' }. Matches only once something
 * follows the article and a space, so "la" or "una " (still being typed) don't.
 */
export function splitLeadingArticle(spanish: string): { article: Article; rest: string } | null {
  const match = LEADING_ARTICLE.exec(spanish);
  if (!match) return null;
  return { article: match[1].toLowerCase() as Article, rest: spanish.slice(match[0].length) };
}

/** An article moved from the Spanish field; `previous` is a different article it replaced. */
export interface ArticleMove {
  article: Article;
  previous?: Article;
}

/**
 * Nouns only: move an article written at the start of the Spanish field
 * ("la casa") to the Article field. The written article wins over a selected
 * one. Returns null when there's nothing to move.
 */
export function moveLeadingArticle(values: WordFormValues): { values: WordFormValues; move: ArticleMove } | null {
  if (!nounFieldsApply(values.type)) return null;
  const split = splitLeadingArticle(values.spanish);
  if (!split) return null;
  const previous = values.article && values.article !== split.article ? values.article : undefined;
  return {
    values: { ...values, spanish: split.rest, article: split.article },
    move: { article: split.article, ...(previous && { previous }) },
  };
}

/** Trimmed values with the fields that don't apply to the chosen type removed. */
function normalized(values: WordFormValues) {
  const noun = nounFieldsApply(values.type);
  const verb = verbFieldsApply(values.type);
  return {
    spanish: values.spanish.trim(),
    english: values.english.trim(),
    type: values.type || undefined,
    article: (noun && values.article) || undefined,
    plural: (noun && values.plural.trim()) || undefined,
    conjugations: verb ? cleanConjugations(values.conjugations) : undefined,
    // Keeps the kind plus only the chosen kind's non-empty forms.
    adjective: adjectiveFieldsApply(values.type) ? cleanAdjective(values.adjective) : undefined,
  };
}

export function formCompletenessFields(values: WordFormValues): WordCompletenessFields {
  const { spanish, english, type, article } = normalized(values);
  return { spanish, english, ...(type && { type }), ...(article && { article }) };
}

/** For creating a word: fields that are empty or don't apply are omitted. */
export function formToWordInput(values: WordFormValues): WordInput {
  const { spanish, english, type, article, plural, conjugations, adjective } = normalized(values);
  return {
    spanish,
    english,
    ...(type && { type }),
    ...(article && { article }),
    ...(plural && { plural }),
    ...(conjugations && { conjugations }),
    ...(adjective && { adjective }),
  };
}

/** For updating a word: fields that are empty or don't apply are cleared (null → deleteField()). */
export function formToWordUpdate(values: WordFormValues): WordUpdate {
  const { spanish, english, type, article, plural, conjugations, adjective } = normalized(values);
  return {
    spanish,
    english,
    type: type ?? null,
    article: article ?? null,
    plural: plural ?? null,
    conjugations: conjugations ?? null,
    adjective: adjective ?? null,
  };
}
