/**
 * Adjective forms config – the single source of truth for four-form and
 * two-form adjectives. Keys are plain ASCII (stored in Firestore); labels are UI-only.
 *
 * Stored shape (adjectives only; the kind is always stored, forms only when non-empty):
 *   adjective = { kind: 'four', feminine?, masculinePlural?, femininePlural? }
 *   adjective = { kind: 'two', plural? }
 * The word's `spanish` field holds the base form: masculine singular (four-form)
 * or singular (two-form). firestore.rules mirrors these keys. See docs/word-model.md.
 */

export interface AdjectiveFormConfig {
  key: string;
  label: string;
  /** Short label for compact display next to the word, e.g. "f. pl.". */
  short: string;
  placeholder: string;
}

export interface AdjectiveKindConfig {
  key: string;
  label: string;
  /** Example of all forms, shown in the switch. */
  example: string;
  /** What the `spanish` field holds for this kind. */
  baseLabel: string;
  basePlaceholder: string;
  forms: readonly AdjectiveFormConfig[];
}

export const ADJECTIVE_KINDS = [
  {
    key: 'four',
    label: 'Specific',
    example: 'bonito · bonita · bonitos · bonitas',
    baseLabel: 'masculine singular',
    basePlaceholder: 'bonito',
    forms: [
      { key: 'feminine', label: 'Feminine singular', short: 'f.', placeholder: 'bonita' },
      { key: 'masculinePlural', label: 'Masculine plural', short: 'm. pl.', placeholder: 'bonitos' },
      { key: 'femininePlural', label: 'Feminine plural', short: 'f. pl.', placeholder: 'bonitas' },
    ],
  },
  {
    key: 'two',
    label: 'Neutral',
    example: 'verde · verdes',
    baseLabel: 'singular',
    basePlaceholder: 'verde',
    forms: [{ key: 'plural', label: 'Plural', short: 'pl.', placeholder: 'verdes' }],
  },
] as const satisfies readonly AdjectiveKindConfig[];

type Kinds = (typeof ADJECTIVE_KINDS)[number];
export type AdjectiveKind = Kinds['key'];
/** Every form key across all kinds. */
export type AdjectiveFormKey = Kinds['forms'][number]['key'];

/** Typed stored shape, derived from ADJECTIVE_KINDS (a discriminated union on `kind`). */
export type AdjectiveForms = {
  [K in Kinds as K['key']]: { kind: K['key'] } & Partial<Record<K['forms'][number]['key'], string>>;
}[AdjectiveKind];

/** Kind used when an adjective has no stored kind yet. */
export const DEFAULT_ADJECTIVE_KIND: AdjectiveKind = 'four';

export function adjectiveKindConfig(kind: AdjectiveKind): AdjectiveKindConfig {
  return ADJECTIVE_KINDS.find((k) => k.key === kind) ?? ADJECTIVE_KINDS[0];
}

export function isAdjectiveKind(value: unknown): value is AdjectiveKind {
  return typeof value === 'string' && ADJECTIVE_KINDS.some((k) => k.key === value);
}
