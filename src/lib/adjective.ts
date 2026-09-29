/**
 * Pure helpers for adjective forms, driven by ADJECTIVE_KINDS
 * (src/constants/adjective.ts). Used by the form, the repository (before
 * writing) and the Firestore converter (when reading).
 */
import { ADJECTIVE_KINDS, DEFAULT_ADJECTIVE_KIND, adjectiveKindConfig, isAdjectiveKind } from '../constants/adjective';
import type { AdjectiveFormKey, AdjectiveForms, AdjectiveKind } from '../constants/adjective';

/** Same limit as firestore.rules. */
const MAX_FORM_LENGTH = 300;

/** Flat form state: the chosen kind plus a string for every form key of every kind. */
export type AdjectiveFormState = { kind: AdjectiveKind } & Record<AdjectiveFormKey, string>;

/**
 * Keep the kind and only that kind's forms, trimmed and non-empty (at most 300
 * characters). Accepts untrusted input. Returns undefined without a valid kind.
 * The kind alone is kept, since it records the four-form / two-form choice.
 */
export function cleanAdjective(value: unknown): AdjectiveForms | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  if (!isAdjectiveKind(source.kind)) return undefined;
  const result: Record<string, string> = { kind: source.kind };
  for (const form of adjectiveKindConfig(source.kind).forms) {
    const raw = source[form.key];
    const trimmed = typeof raw === 'string' ? raw.trim().slice(0, MAX_FORM_LENGTH) : '';
    if (trimmed) result[form.key] = trimmed;
  }
  return result as AdjectiveForms;
}

/**
 * Form state for a stored adjective (or a fresh one): its kind (default four-form)
 * and every form key of every kind, so switching kinds in the form never loses input.
 */
export function adjectiveToFormState(adjective?: AdjectiveForms): AdjectiveFormState {
  const state: Record<string, string> = { kind: adjective?.kind ?? DEFAULT_ADJECTIVE_KIND };
  for (const kind of ADJECTIVE_KINDS) {
    for (const form of kind.forms) state[form.key] = adjectiveForm(adjective, form.key);
  }
  return state as AdjectiveFormState;
}

/** Filled-in forms of the kinds other than the chosen one; cleanAdjective drops these on save. */
export function discardedAdjectiveForms(state: AdjectiveFormState) {
  return ADJECTIVE_KINDS.filter((kind) => kind.key !== state.kind).flatMap((kind) =>
    kind.forms
      .map((form) => ({ kind, form, value: state[form.key].trim() }))
      .filter((entry) => entry.value),
  );
}

/** A stored form value ('' when absent). */
export function adjectiveForm(adjective: AdjectiveForms | undefined, key: AdjectiveFormKey): string {
  const value = (adjective as Record<string, unknown> | undefined)?.[key];
  return typeof value === 'string' ? value : '';
}

/** Filled forms of the stored kind, in config order, e.g. for display next to the word. */
export function adjectiveFormList(adjective: AdjectiveForms | undefined) {
  if (!adjective) return [];
  return adjectiveKindConfig(adjective.kind)
    .forms.map((form) => ({ ...form, value: adjectiveForm(adjective, form.key as AdjectiveFormKey) }))
    .filter((form) => form.value);
}
