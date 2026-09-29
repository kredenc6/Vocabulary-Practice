/**
 * Verb conjugation config – the single source of truth for conjugation groups,
 * their tenses/forms and the persons. Keys are plain ASCII (they are stored in
 * Firestore); labels are for the UI.
 *
 * Stored shape (only non-empty values):
 *   conjugations[group][tense][person] = form   – "persons" groups (indicative, imperative)
 *   conjugations[group][form]          = form   – "forms" groups (progressive: gerund)
 *
 * To add a group (e.g. subjunctive, perfect), add one entry to CONJUGATION_GROUPS.
 * The editor, types and data handling follow automatically. firestore.rules
 * mirrors the keys – add the group there too. See docs/word-model.md.
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

export interface TenseConfig {
  key: string;
  label: string;
  /** Short hint shown above the rows. */
  note?: string;
}

/** A group whose tenses have one form per person. */
export interface PersonsGroupConfig {
  kind: 'persons';
  key: string;
  label: string;
  /** Persons that don't exist in this group (shown disabled, never stored). */
  excludedPersons?: readonly Person[];
  /** Group-specific person labels, overriding PERSON_LABELS. */
  personLabels?: Partial<Record<Person, string>>;
  /** Offer filling the whole group from a pasted table (see parseConjugationTable). */
  tablePaste?: boolean;
  tenses: readonly TenseConfig[];
}

export interface SingleFormConfig {
  key: string;
  label: string;
  placeholder?: string;
}

/** A group with a few single (non-personal) forms, e.g. the gerund. */
export interface FormsGroupConfig {
  kind: 'forms';
  key: string;
  label: string;
  note?: string;
  forms: readonly SingleFormConfig[];
}

export type GroupConfig = PersonsGroupConfig | FormsGroupConfig;

export const CONJUGATION_GROUPS = [
  {
    kind: 'persons',
    key: 'indicative',
    label: 'Indicative',
    tablePaste: true,
    tenses: [
      { key: 'present', label: 'Present' },
      { key: 'preterite', label: 'Preterite' },
      { key: 'imperfect', label: 'Imperfect' },
      { key: 'conditional', label: 'Conditional' },
      { key: 'future', label: 'Future' },
    ],
  },
  {
    kind: 'persons',
    key: 'imperative',
    label: 'Imperative',
    excludedPersons: ['yo'],
    personLabels: { el: 'Ud.', ellos: 'Uds.' },
    tablePaste: true,
    tenses: [
      { key: 'affirmative', label: 'Affirmative', note: 'e.g. habla, hable, hablad' },
      { key: 'negative', label: 'Negative', note: 'Include “no”, e.g. no hables, no hable' },
    ],
  },
  {
    kind: 'forms',
    key: 'progressive',
    label: 'Progressive',
    note: 'The estar + gerund forms (estoy hablando, …) are generated from the gerund.',
    forms: [{ key: 'gerund', label: 'Gerund', placeholder: 'e.g. trabajando' }],
  },
] as const satisfies readonly GroupConfig[];

type Groups = (typeof CONJUGATION_GROUPS)[number];
export type ConjugationGroupKey = Groups['key'];

type PersonForms = Partial<Record<Person, string>>;

/** Typed stored shape, derived from CONJUGATION_GROUPS. */
export type Conjugations = {
  [G in Groups as G['key']]?: G extends { tenses: readonly { key: infer K extends string }[] }
    ? Partial<Record<K, PersonForms>>
    : G extends { forms: readonly { key: infer K extends string }[] }
      ? Partial<Record<K, string>>
      : never;
};

export function personApplies(group: PersonsGroupConfig, person: Person): boolean {
  return !group.excludedPersons?.includes(person);
}

export function personLabel(group: PersonsGroupConfig, person: Person): string {
  return group.personLabels?.[person] ?? PERSON_LABELS[person];
}
