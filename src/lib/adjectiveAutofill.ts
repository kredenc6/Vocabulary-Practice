import type { AdjectiveFormKey, AdjectiveKind } from '../constants/adjective';
import type { AdjectiveFormState } from './adjective';

/** Conservative suggestions, not a dictionary or a validator of Spanish words.
 * References: https://www.rae.es/dpd/plural and https://www.rae.es/dpd/colores
 */
const VARIABLE = new Set(`
  alemán catalán danés francés inglés irlandés escocés galés portugués holandés
  japonés finlandés español andaluz mallorquín menorquín
  cordobés leonés aragonés navarrés taiwanés nepalés mongol
  holgazán haragán charlatán llorón juguetón dormilón comilón cabezón
  mandón gruñón burlón chiquitín saltarín bailarín
  traidor creador seductor destructor protector defensor agresor
  constructor conductor traductor productor director
`.trim().split(/\s+/));

const FEMININE = new Map([
  ['grandote', 'grandota'], ['regordete', 'regordeta'], ['gordote', 'gordota'],
  ['pequeñín', 'pequeñina'], ['grandullón', 'grandullona'],
]);

const SHARED = new Set(`
  mejor peor mayor menor superior inferior anterior posterior interior exterior
  ulterior multicolor bicolor joven virgen común afín ruin marrón
  cortés descortés gris feliz capaz eficaz tenaz feroz veloz precoz audaz
  optimista pesimista realista idealista egoísta indígena agrícola hipócrita
  belga persa croata vietnamita rosa naranja violeta lila malva turquesa
  escarlata púrpura caqui beige cursi sexi marroquí iraní israelí iraquí
  pakistaní saudí hindú carmesí tabú
`.trim().split(/\s+/));

const INVARIABLE = new Set(['isósceles', 'gratis', 'unisex']);
// Nouns used as modifiers, loans and shortened forms need context.
const MANUAL = new Set(['modelo', 'macho', 'hembra', 'extra', 'super', 'súper', 'light', 'sexy', 'porno', 'tecno']);
const PLURALS = new Map([['joven', 'jóvenes'], ['virgen', 'vírgenes'], ['común', 'comunes']]);

const KEYS: AdjectiveFormKey[] = ['feminine', 'masculinePlural', 'femininePlural', 'plural'];
type Generated = Partial<Record<AdjectiveFormKey, string>>;
export type AdjectiveSuggestion = { kind: AdjectiveKind; forms: Generated };

/** Remove only acute accents, preserving ñ and ü. */
function withoutAcute(word: string): string {
  return word.replace(/[áéíóú]/g, (letter) => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' })[letter]!);
}

function plural(word: string): string | undefined {
  if (INVARIABLE.has(word)) return word;
  if (PLURALS.has(word)) return PLURALS.get(word);
  if (/[aeiouáéó]$/.test(word)) return `${word}s`;
  // Choose the standard -es option; alternative -s forms remain editable.
  if (/[íú]$/.test(word)) return `${word}es`;
  if (/z$/.test(word)) return `${word.slice(0, -1)}ces`;
  // Final stressed syllable loses its accent when -es makes it penultimate.
  if (/[áéó][ns]$/.test(word) || /[íú]n$/.test(word)) return `${withoutAcute(word)}es`;
  // A written accent elsewhere remains (difícil -> difíciles).
  if (/[lrnd]$/.test(word)) return `${word}es`;
  if (word === 'gris') return 'grises';
  return undefined;
}

function matchCase(form: string, source: string): string {
  if (source === source.toLocaleUpperCase('es')) return form.toLocaleUpperCase('es');
  if (source[0] === source[0].toLocaleUpperCase('es')) return form[0].toLocaleUpperCase('es') + form.slice(1);
  return form;
}

export function suggestAdjective(spanish: string): AdjectiveSuggestion | undefined {
  const source = spanish.trim().normalize('NFC');
  // Phrases, slash-separated alternatives, abbreviations and hyphens need review.
  if (!/^[a-záéíóúüñ]+$/i.test(source)) return undefined;
  const word = source.toLocaleLowerCase('es');
  if (MANUAL.has(word)) return undefined;
  let feminine: string | undefined;
  if (FEMININE.has(word)) feminine = FEMININE.get(word);
  else if (SHARED.has(word) || INVARIABLE.has(word)) feminine = undefined;
  else if (/o$/.test(word)) feminine = `${word.slice(0, -1)}a`;
  else if (VARIABLE.has(word) || /dor$/.test(word)) feminine = `${withoutAcute(word)}a`;
  else if (/(ote|ete)$/.test(word) || !/(e|ista|ar|[lz])$/.test(word)) return undefined;

  const masculinePlural = plural(word);
  if (!masculinePlural) return undefined;
  if (!feminine) return { kind: 'two', forms: { plural: matchCase(masculinePlural, source) } };
  const femininePlural = plural(feminine);
  if (!femininePlural) return undefined;
  return {
    kind: 'four',
    forms: {
      feminine: matchCase(feminine, source),
      masculinePlural: matchCase(masculinePlural, source),
      femininePlural: matchCase(femininePlural, source),
    },
  };
}

/** Session-only ownership: saved or manually edited values are never overwritten. */
export interface AdjectiveAutofillSession {
  generated: Generated;
  edited: Set<AdjectiveFormKey>;
  kindLocked: boolean;
}

export function createAdjectiveAutofillSession(kindLocked = false): AdjectiveAutofillSession {
  return { generated: {}, edited: new Set(), kindLocked };
}

export function autofillAdjective(
  spanish: string,
  current: AdjectiveFormState,
  session: AdjectiveAutofillSession,
): { adjective: AdjectiveFormState; session: AdjectiveAutofillSession } {
  const suggestion = suggestAdjective(spanish);
  const adjective = { ...current };
  // Existing manual forms also protect their kind from automatic switching.
  const hasManualForms = KEYS.some((key) => current[key] && current[key] !== session.generated[key]);
  if (suggestion && !session.kindLocked && session.edited.size === 0 && !hasManualForms) {
    adjective.kind = suggestion.kind;
  }
  const forms = suggestion?.kind === adjective.kind ? suggestion.forms : {};
  const generated: Generated = {};
  for (const key of KEYS) {
    if (session.edited.has(key)) continue;
    if (!current[key] || current[key] === session.generated[key]) {
      // Also clear obsolete auto-generated values, including on unknown input.
      adjective[key] = forms[key] ?? '';
      if (forms[key]) generated[key] = forms[key];
    }
  }
  return { adjective, session: { ...session, generated } };
}
