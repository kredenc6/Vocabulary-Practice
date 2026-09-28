import type {
  CardDirection,
  PracticeCard,
  PracticeMode,
  PracticeSettings,
  VocabWord,
  WordSource,
} from '../types';
import { sameAnswer } from './answerCheck';
import { isDue } from './srs';
import { formatSpanish } from './wordDisplay';

export const MODE_LABELS: Record<PracticeMode, string> = {
  flashcard: 'Flashcards',
  'multiple-choice': 'Multiple choice',
  typed: 'Typed translation',
};

export const DIRECTION_LABELS = {
  'es-en': 'Spanish → English',
  'en-es': 'English → Spanish',
  mixed: 'Mixed',
} as const;

export const LANGUAGE_NAMES: Record<'spanish' | 'english', string> = {
  spanish: 'Spanish',
  english: 'English',
};

/** Multiple choice needs the correct answer plus this many distractors. */
const DISTRACTORS = 3;

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function promptSide(direction: CardDirection): 'spanish' | 'english' {
  return direction === 'es-en' ? 'spanish' : 'english';
}

export function answerSide(direction: CardDirection): 'spanish' | 'english' {
  return direction === 'es-en' ? 'english' : 'spanish';
}

/** Text of one side of a word: the formatted Spanish ("un hombre") or the English translation. */
export function sideText(word: VocabWord, side: 'spanish' | 'english'): string {
  return side === 'spanish' ? formatSpanish(word) : word.english;
}

export const promptText = (card: PracticeCard) => sideText(card.word, promptSide(card.direction));
/** The expected answer: typed answers are checked against it, and it's the correct multiple-choice option. */
export const answerText = (card: PracticeCard) => sideText(card.word, answerSide(card.direction));

/** Due words: overdue reviews first (most overdue first), then new words (oldest first). */
function dueWords(words: VocabWord[], now: number): VocabWord[] {
  const due = words.filter((w) => isDue(w, now));
  const reviews = due.filter((w) => w.lastReviewedAt !== null).sort((a, b) => a.nextReviewDate - b.nextReviewDate);
  const fresh = due.filter((w) => w.lastReviewedAt === null).sort((a, b) => a.createdAt - b.createdAt);
  return [...reviews, ...fresh];
}

/** Words with the lowest success rate and ease factor first. */
function weakestWords(words: VocabWord[]): VocabWord[] {
  const score = (w: VocabWord) => (w.totalReviews ? w.correctReviews / w.totalReviews : 1) + w.easeFactor / 10;
  const practiced = words.filter((w) => w.totalReviews > 0).sort((a, b) => score(a) - score(b));
  const unpracticed = shuffle(words.filter((w) => w.totalReviews === 0));
  return [...practiced, ...unpracticed];
}

export function selectWords(words: VocabWord[], source: WordSource, size: number, now = Date.now()): VocabWord[] {
  switch (source) {
    case 'due':
      return dueWords(words, now).slice(0, size);
    case 'weakest':
      return weakestWords(words).slice(0, size);
    case 'random':
      return shuffle(words).slice(0, size);
  }
}

/** Build answer options: the correct translation plus distinct distractors. */
function buildOptions(word: VocabWord, direction: CardDirection, pool: VocabWord[]): string[] | null {
  const side = answerSide(direction);
  const correct = sideText(word, side);
  const distractors: string[] = [];
  for (const candidate of shuffle(pool)) {
    if (candidate.id === word.id) continue;
    const text = sideText(candidate, side);
    if (sameAnswer(text, correct) || distractors.some((d) => sameAnswer(d, text))) continue;
    distractors.push(text);
    if (distractors.length === DISTRACTORS) break;
  }
  if (distractors.length < DISTRACTORS) return null;
  return shuffle([correct, ...distractors]);
}

let cardCounter = 0;

/** Create a card for a word, picking direction and mode according to the settings. */
export function makeCard(word: VocabWord, settings: PracticeSettings, pool: VocabWord[]): PracticeCard {
  const direction: CardDirection =
    settings.direction === 'mixed' ? pickRandom<CardDirection>(['es-en', 'en-es']) : settings.direction;

  const modes = shuffle(settings.modes);
  for (const mode of modes) {
    if (mode === 'multiple-choice') {
      const options = buildOptions(word, direction, pool);
      if (!options) continue;
      return { key: `c${cardCounter++}`, word, direction, mode, options };
    }
    return { key: `c${cardCounter++}`, word, direction, mode };
  }
  // Multiple choice was the only mode but there aren't enough distinct words.
  return { key: `c${cardCounter++}`, word, direction, mode: 'flashcard' };
}

/** Ask the same card again (same word, mode and direction) under a new key. */
export function repeatCard(card: PracticeCard): PracticeCard {
  return { ...card, key: `c${cardCounter++}` };
}

/** Number of distinct translations available, used to decide if multiple choice is possible. */
export function canUseMultipleChoice(words: VocabWord[]): boolean {
  const english = new Set(words.map((w) => w.english.trim().toLowerCase()));
  const spanish = new Set(words.map((w) => formatSpanish(w).toLowerCase()));
  return Math.min(english.size, spanish.size) >= DISTRACTORS + 1;
}

export const DEFAULT_SETTINGS: PracticeSettings = {
  direction: 'es-en',
  modes: ['flashcard', 'multiple-choice', 'typed'],
  source: 'due',
  sessionSize: 20,
  repeatMistakes: true,
};

const SETTINGS_KEY = 'vocab-practice-settings';

export function loadSettings(): PracticeSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PracticeSettings>;
    const settings = { ...DEFAULT_SETTINGS, ...parsed };
    return settings.modes.length ? settings : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: PracticeSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private mode) – settings just won't be remembered.
  }
}
