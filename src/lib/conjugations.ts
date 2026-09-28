/**
 * Pure helpers for verb conjugations (see src/constants/conjugation.ts).
 * Used by the form, the repository (before writing) and the Firestore
 * converter (when reading), so all three agree on what gets stored.
 */
import { PERSONS, TENSES, isPerson, isTense, personApplies } from '../constants/conjugation';
import type { Conjugations, Person, Tense } from '../constants/conjugation';

/** Same limit as firestore.rules. */
export const MAX_FORM_LENGTH = 300;

/**
 * Keep only known tenses/persons that apply, with trimmed non-empty string
 * values (at most 300 characters). Accepts untrusted input (e.g. Firestore
 * data). Returns undefined when nothing is left, so the field can be omitted.
 */
export function cleanConjugations(value: unknown): Conjugations | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const result: Conjugations = {};
  for (const [tense, forms] of Object.entries(value)) {
    if (!isTense(tense) || !forms || typeof forms !== 'object') continue;
    const cleaned: Partial<Record<Person, string>> = {};
    for (const [person, form] of Object.entries(forms)) {
      if (!isPerson(person) || !personApplies(tense, person) || typeof form !== 'string') continue;
      const trimmed = form.trim().slice(0, MAX_FORM_LENGTH);
      if (trimmed) cleaned[person] = trimmed;
    }
    if (Object.keys(cleaned).length) result[tense] = cleaned;
  }
  return Object.keys(result).length ? result : undefined;
}

/** Trimmed gerund, or undefined when empty. */
export function cleanGerund(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, MAX_FORM_LENGTH);
  return trimmed || undefined;
}

/** Number of filled forms in one tense (only persons that apply). */
export function countTenseForms(conjugations: Conjugations, tense: Tense): number {
  return PERSONS.filter((p) => {
    const form: unknown = conjugations[tense]?.[p];
    return personApplies(tense, p) && typeof form === 'string' && form.trim() !== '';
  }).length;
}

/** Number of filled conjugation forms plus the gerund. */
export function countForms(conjugations: Conjugations, gerund: string): number {
  return TENSES.reduce((sum, tense) => sum + countTenseForms(conjugations, tense), 0) + (gerund.trim() ? 1 : 0);
}
