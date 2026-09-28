/**
 * Verb conjugation config – the single source of truth for tenses and persons.
 * Keys are plain ASCII (they are stored in Firestore); labels are for the UI.
 *
 * To add a tense (e.g. subjunctive), add one entry to TENSE_CONFIG. The editor,
 * types and data handling follow automatically. firestore.rules repeats the
 * tense keys in `tenses()` – add it there too. See docs/word-model.md.
 */

export const PERSONS = ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'] as const;
export type Person = (typeof PERSONS)[number];

export const PERSON_LABELS: Record<Person, string> = {
  yo: 'yo',
  tu: 'tú',
  el: 'él/ella/Ud.',
  nosotros: 'nosotros',
  vosotros: 'vosotros',
  ellos: 'ellos/ellas/Uds.',
};

interface TenseConfig {
  key: string;
  label: string;
  /** Persons that don't exist in this tense (shown disabled, never stored). */
  excludedPersons?: readonly Person[];
  /** Tense-specific person labels, overriding PERSON_LABELS. */
  personLabels?: Partial<Record<Person, string>>;
}

export const TENSE_CONFIG = [
  { key: 'present', label: 'Present' },
  { key: 'preterite', label: 'Preterite' },
  { key: 'imperfect', label: 'Imperfect' },
  { key: 'conditional', label: 'Conditional' },
  { key: 'future', label: 'Future' },
  { key: 'imperative', label: 'Imperative', excludedPersons: ['yo'], personLabels: { el: 'Ud.', ellos: 'Uds.' } },
] as const satisfies readonly TenseConfig[];

export type Tense = (typeof TENSE_CONFIG)[number]['key'];

export const TENSES: readonly Tense[] = TENSE_CONFIG.map((t) => t.key);

/** Stored shape: conjugations[tense][person] = form, only non-empty values. */
export type Conjugations = Partial<Record<Tense, Partial<Record<Person, string>>>>;

function tenseConfig(tense: Tense): TenseConfig {
  return TENSE_CONFIG.find((t) => t.key === tense)!;
}

export function tenseLabel(tense: Tense): string {
  return tenseConfig(tense).label;
}

export function personApplies(tense: Tense, person: Person): boolean {
  return !tenseConfig(tense).excludedPersons?.includes(person);
}

export function personLabel(tense: Tense, person: Person): string {
  return tenseConfig(tense).personLabels?.[person] ?? PERSON_LABELS[person];
}

export function isTense(value: unknown): value is Tense {
  return typeof value === 'string' && (TENSES as readonly string[]).includes(value);
}

export function isPerson(value: unknown): value is Person {
  return typeof value === 'string' && (PERSONS as readonly string[]).includes(value);
}
