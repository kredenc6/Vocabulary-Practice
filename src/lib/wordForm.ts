/**
 * Form values for adding/editing a word and their conversion to the stored
 * model (see docs/word-model.md). Article and plural only apply to nouns.
 */
import type { Article, WordType } from '../constants/word';
import type { VocabWordData, WordInput, WordUpdate } from '../types';
import type { WordCompletenessFields } from './wordValidation';

/** Raw form state; `''` means "not selected / not filled in". */
export interface WordFormValues {
  spanish: string;
  english: string;
  type: WordType | '';
  article: Article | '';
  plural: string;
}

export const EMPTY_WORD_FORM: WordFormValues = { spanish: '', english: '', type: '', article: '', plural: '' };

export function wordToFormValues(word: VocabWordData): WordFormValues {
  return {
    spanish: word.spanish,
    english: word.english,
    type: word.type ?? '',
    article: word.article ?? '',
    plural: word.plural ?? '',
  };
}

export function nounFieldsApply(type: WordType | ''): boolean {
  return type === 'noun';
}

/** Change the type; article and plural are dropped when the type is no longer a noun. */
export function withType(values: WordFormValues, type: WordType | ''): WordFormValues {
  return nounFieldsApply(type) ? { ...values, type } : { ...values, type, article: '', plural: '' };
}

/** Trimmed values with the fields that don't apply to the chosen type removed. */
function normalized(values: WordFormValues) {
  const noun = nounFieldsApply(values.type);
  return {
    spanish: values.spanish.trim(),
    english: values.english.trim(),
    type: values.type || undefined,
    article: (noun && values.article) || undefined,
    plural: (noun && values.plural.trim()) || undefined,
  };
}

export function formCompletenessFields(values: WordFormValues): WordCompletenessFields {
  const { spanish, english, type, article } = normalized(values);
  return { spanish, english, ...(type && { type }), ...(article && { article }) };
}

/** For creating a word: fields that are empty or don't apply are omitted. */
export function formToWordInput(values: WordFormValues): WordInput {
  const { spanish, english, type, article, plural } = normalized(values);
  return { spanish, english, ...(type && { type }), ...(article && { article }), ...(plural && { plural }) };
}

/** For updating a word: fields that are empty or don't apply are cleared (null → deleteField()). */
export function formToWordUpdate(values: WordFormValues): WordUpdate {
  const { spanish, english, type, article, plural } = normalized(values);
  return { spanish, english, type: type ?? null, article: article ?? null, plural: plural ?? null };
}
