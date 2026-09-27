import type { AnswerOutcome } from '../types';

export interface AnswerCheck {
  outcome: AnswerOutcome;
  /** Explanation shown for "close enough" answers. */
  note?: string;
}

const SPANISH_ARTICLE = /^(el|la|los|las|un|una|unos|unas)\s+/;
const ENGLISH_LEADING = /^(to|the|a|an)\s+/;
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Lowercase, trim, drop punctuation and parenthesised hints, collapse spaces. */
export function normalize(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[¿?¡!.,;:"'`´«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Remove diacritics (á → a, ñ → n, ü → u). */
export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '');
}

/** Drop a leading article or the English infinitive "to". */
function core(text: string): string {
  return text.replace(SPANISH_ARTICLE, '').replace(ENGLISH_LEADING, '');
}

function spanishArticle(text: string): string | null {
  return SPANISH_ARTICLE.exec(text)?.[1] ?? null;
}

/**
 * All accepted alternatives of an expected answer, normalized. Translations may
 * list alternatives separated by "/", ";" or ",", e.g. "car / automobile".
 */
export function acceptedAnswers(expected: string): string[] {
  const forms = new Set<string>();
  for (const part of [expected, ...expected.split(/[/;,]/)]) {
    const n = normalize(part);
    if (n) forms.add(n);
  }
  return [...forms];
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/** Typos allowed for a word of the given length. */
function allowedTypos(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  if (length <= 12) return 2;
  return 3;
}

/**
 * Compare a typed answer with the expected translation.
 * - Case, punctuation and parenthesised hints are ignored.
 * - English "to"/"the"/"a" are optional.
 * - A missing or wrong Spanish article, missing accents and small typos are
 *   accepted as "close enough" with a hint.
 */
export function checkTypedAnswer(input: string, expected: string): AnswerCheck {
  const given = normalize(input);
  if (!given) return { outcome: 'incorrect' };
  const givenCore = core(given);
  const accepted = acceptedAnswers(expected);

  for (const form of accepted) {
    if (given === form) return { outcome: 'correct' };
  }

  for (const form of accepted) {
    if (givenCore !== core(form)) continue;
    const article = spanishArticle(form);
    if (article && spanishArticle(given) !== article) {
      return { outcome: 'close', note: `Close enough – mind the article: “${form}”.` };
    }
    return { outcome: 'correct' };
  }

  for (const form of accepted) {
    if (stripAccents(givenCore) === stripAccents(core(form))) {
      return { outcome: 'close', note: 'Close enough – watch the accents.' };
    }
  }

  // Compare full forms too, so a typo inside "the"/"el" etc. is still tolerated.
  for (const form of accepted) {
    const pairs: [string, string][] = [
      [given, form],
      [givenCore, core(form)],
    ];
    for (const [g, f] of pairs) {
      const target = stripAccents(f);
      if (levenshtein(stripAccents(g), target) <= allowedTypos(target.length)) {
        return { outcome: 'close', note: 'Close enough – check the spelling.' };
      }
    }
  }

  return { outcome: 'incorrect' };
}

/** True if two translations would be indistinguishable as answer options. */
export function sameAnswer(a: string, b: string): boolean {
  return stripAccents(normalize(a)) === stripAccents(normalize(b));
}
