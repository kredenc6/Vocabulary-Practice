/**
 * Spanish/English duplicate detection shared by adding, editing, and CSV import.
 * Checks each word's primary `spanish` form as well as optional noun plurals
 * and active-kind adjective forms (feminine and plurals).
 */
import type { VocabWordData, WordInput, WordPairInput } from '../types';
import { adjectiveFormList } from './adjective';
import { completeWordTab } from './wordDisplay';
import { wordLabel } from './wordForm';

export type DuplicateCheckWord = Pick<WordInput, 'spanish' | 'english' | 'type' | 'plural' | 'adjective'>;

const normalizeKeyPart = (value: string) => value.trim().normalize('NFC').toLowerCase();

function pairKeyForForm(spanishForm: string, english: string): string {
  return `${normalizeKeyPart(spanishForm)}\u0000${normalizeKeyPart(english)}`;
}

/** Primary Spanish/English duplicate key for a word's base `spanish` and `english`. */
export function pairKey(pair: WordPairInput): string {
  return pairKeyForForm(pair.spanish, pair.english);
}

/** Spanish forms of a word used for duplicate checks (base, noun plural, active adjective forms). */
function spanishForms(word: DuplicateCheckWord): string[] {
  const forms = [word.spanish];
  if ((!word.type || word.type === 'noun') && word.plural) {
    forms.push(word.plural);
  }
  if ((!word.type || word.type === 'adjective') && word.adjective) {
    for (const form of adjectiveFormList(word.adjective)) {
      forms.push(form.value);
    }
  }
  return forms;
}

/** All unique `(spanishForm, english)` duplicate keys for a word, with the primary key first. */
export function pairKeys(word: DuplicateCheckWord): string[] {
  const keys = new Set<string>([pairKey(word)]);
  for (const form of spanishForms(word)) {
    if (!form.trim()) continue;
    keys.add(pairKeyForForm(form, word.english));
  }
  return [...keys];
}

/**
 * Find a conflicting word in `existing`, preferring an exact primary `pairKey`
 * match over a match through optional plural or adjective forms.
 */
export function findDuplicateWord<T extends DuplicateCheckWord & { id?: string }>(
  candidate: DuplicateCheckWord,
  existing: readonly T[],
  excludeId?: string,
): T | undefined {
  const baseKey = pairKey(candidate);
  const candidateKeys = new Set(pairKeys(candidate));

  let formMatch: T | undefined;
  for (const word of existing) {
    if (excludeId !== undefined && word.id === excludeId) continue;
    if (pairKey(word) === baseKey) return word;
    if (!formMatch && pairKeys(word).some((key) => candidateKeys.has(key))) {
      formMatch = word;
    }
  }
  return formMatch;
}

/** Error message for a duplicate found when adding or editing a word. */
export function duplicateWordMessage(
  candidate: WordInput,
  duplicate: Pick<VocabWordData, 'spanish' | 'english' | 'article' | 'excludedFromPractice'>,
): string {
  const tab = completeWordTab(duplicate);
  const candidateLabel = wordLabel(candidate);
  if (pairKey(candidate) === pairKey(duplicate)) {
    return `"${candidateLabel}" is already in the ${tab} tab.`;
  }
  return `"${candidateLabel}" matches "${wordLabel(duplicate)}" in the ${tab} tab.`;
}
