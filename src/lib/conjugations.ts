/**
 * Pure helpers for verb conjugations, driven by CONJUGATION_GROUPS
 * (src/constants/conjugation.ts). Used by the form, the repository (before
 * writing) and the Firestore converter (when reading), so all three agree on
 * what gets stored. Everything iterates the config, so new groups need no
 * changes here.
 */
import { CONJUGATION_GROUPS, PERSONS, personApplies } from '../constants/conjugation';
import type { Conjugations, GroupConfig, Person, PersonsGroupConfig } from '../constants/conjugation';

/** Same limit as firestore.rules. */
export const MAX_FORM_LENGTH = 300;

/** Untyped view of the nested map for generic, config-driven access. */
type Loose = Record<string, Record<string, unknown> | undefined>;

const asLoose = (conjugations: Conjugations | undefined): Loose => (conjugations ?? {}) as Loose;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cleanForm(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim().slice(0, MAX_FORM_LENGTH) || undefined;
}

/** conjugations[group][tense][person] ('' when empty). */
export function getPersonForm(c: Conjugations, group: string, tense: string, person: Person): string {
  const forms = asLoose(c)[group]?.[tense];
  const value = isRecord(forms) ? forms[person] : undefined;
  return typeof value === 'string' ? value : '';
}

/** conjugations[group][form] ('' when empty). */
export function getSingleForm(c: Conjugations, group: string, form: string): string {
  const value = asLoose(c)[group]?.[form];
  return typeof value === 'string' ? value : '';
}

/** Immutable update of conjugations[group][tense][person]. */
export function setPersonForm(c: Conjugations, group: string, tense: string, person: Person, value: string): Conjugations {
  const loose = asLoose(c);
  const groupData = loose[group] ?? {};
  const tenseData = isRecord(groupData[tense]) ? groupData[tense] : {};
  return { ...loose, [group]: { ...groupData, [tense]: { ...tenseData, [person]: value } } } as Conjugations;
}

/** Immutable update of conjugations[group][form]. */
export function setSingleForm(c: Conjugations, group: string, form: string, value: string): Conjugations {
  const loose = asLoose(c);
  return { ...loose, [group]: { ...(loose[group] ?? {}), [form]: value } } as Conjugations;
}

/**
 * Keep only configured groups/tenses/forms and persons that apply, with
 * trimmed non-empty string values (at most 300 characters). Accepts untrusted
 * input (e.g. Firestore data). Returns undefined when nothing is left, so the
 * field can be omitted.
 */
export function cleanConjugations(value: unknown): Conjugations | undefined {
  if (!isRecord(value)) return undefined;
  const result: Loose = {};
  for (const group of CONJUGATION_GROUPS as readonly GroupConfig[]) {
    const groupValue = value[group.key];
    if (!isRecord(groupValue)) continue;
    const cleanedGroup: Record<string, unknown> = {};
    if (group.kind === 'persons') {
      for (const tense of group.tenses) {
        const tenseValue = groupValue[tense.key];
        if (!isRecord(tenseValue)) continue;
        const forms: Record<string, string> = {};
        for (const person of PERSONS) {
          const form = personApplies(group, person) ? cleanForm(tenseValue[person]) : undefined;
          if (form) forms[person] = form;
        }
        if (Object.keys(forms).length) cleanedGroup[tense.key] = forms;
      }
    } else {
      for (const form of group.forms) {
        const cleaned = cleanForm(groupValue[form.key]);
        if (cleaned) cleanedGroup[form.key] = cleaned;
      }
    }
    if (Object.keys(cleanedGroup).length) result[group.key] = cleanedGroup;
  }
  return Object.keys(result).length ? (result as Conjugations) : undefined;
}

/** Filled forms in one tense of a persons group. */
export function countTenseForms(c: Conjugations, group: PersonsGroupConfig, tense: string): number {
  return PERSONS.filter((p) => personApplies(group, p) && getPersonForm(c, group.key, tense, p).trim() !== '').length;
}

/** Filled forms in a whole group. */
export function countGroupForms(c: Conjugations, group: GroupConfig): number {
  if (group.kind === 'persons') {
    return group.tenses.reduce((sum, tense) => sum + countTenseForms(c, group, tense.key), 0);
  }
  return group.forms.filter((form) => getSingleForm(c, group.key, form.key).trim() !== '').length;
}

/** Filled forms across all groups. */
export function countForms(c: Conjugations): number {
  return (CONJUGATION_GROUPS as readonly GroupConfig[]).reduce((sum, group) => sum + countGroupForms(c, group), 0);
}
