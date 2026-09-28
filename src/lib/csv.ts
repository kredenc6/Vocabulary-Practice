/**
 * CSV import/export (see docs/word-model.md → CSV import).
 *
 * Format: UTF-8 text, fixed delimiter "|", header row required. Header names
 * are the stored field names (trim + case-insensitive, any order):
 * spanish, english (required), type, article, plural (optional).
 */
import Papa from 'papaparse';
import { isArticle, isWordType } from '../constants/word';
import type { Article, WordType } from '../constants/word';
import type { VocabWord, WordInput, WordPairInput } from '../types';
import { isComplete } from './wordValidation';

export const CSV_DELIMITER = '|';
export const CSV_REQUIRED_COLUMNS = ['spanish', 'english'] as const;
export const CSV_OPTIONAL_COLUMNS = ['type', 'article', 'plural'] as const;
export const CSV_COLUMNS = [...CSV_REQUIRED_COLUMNS, ...CSV_OPTIONAL_COLUMNS] as const;
export type CsvColumn = (typeof CSV_COLUMNS)[number];

/** Header line for the downloadable template. */
export const CSV_TEMPLATE = CSV_COLUMNS.join(CSV_DELIMITER);

/** Same limit as firestore.rules; longer values would make the whole batch fail. */
const MAX_LENGTH = 300;

/** Byte order mark, stripped from the start of the file. */
const BOM = String.fromCharCode(0xfeff);
/** What the UTF-8 decoder produces for bytes that aren't valid UTF-8. */
const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

export interface CsvRowIssue {
  /** 1-based row number in the file (the header is row 1). */
  row: number;
  message: string;
}

export interface CsvImportPlan {
  /** Words to store, in file order. */
  words: WordInput[];
  completeCount: number;
  draftCount: number;
  /** Skipped because the Spanish word already exists (or appeared earlier in the file). */
  duplicates: CsvRowIssue[];
  /** Skipped rows. */
  errors: CsvRowIssue[];
  /** Imported rows where a value was invalid and treated as missing. */
  invalidValues: CsvRowIssue[];
  /** File-level notes, e.g. ignored unknown columns. */
  warnings: string[];
}

export type CsvParseResult = { ok: true; plan: CsvImportPlan } | { ok: false; error: string };

/** Duplicate key: the Spanish word only, trimmed and case-insensitive. */
export function spanishKey(spanish: string): string {
  return spanish.trim().toLowerCase();
}

/** Two-field duplicate key used by the manual add form. */
export function pairKey(pair: WordPairInput): string {
  return `${spanishKey(pair.spanish)}\u0000${pair.english.trim().toLowerCase()}`;
}

/**
 * Read a file as UTF-8. Invalid byte sequences decode to U+FFFD, which means
 * the file isn't UTF-8 (e.g. saved as Windows-1250 / ANSI).
 */
export async function readCsvFile(file: File): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const text = await file.text(); // always decodes as UTF-8
  if (text.includes(REPLACEMENT_CHAR)) {
    return {
      ok: false,
      error:
        'This file is not UTF-8 encoded (some characters could not be read). Re-save it as UTF-8 – e.g. in Excel choose "CSV UTF-8", in Notepad choose Encoding → UTF-8 – and import it again. Nothing was imported.',
    };
  }
  return { ok: true, text: text.startsWith(BOM) ? text.slice(BOM.length) : text };
}

const isBlank = (row: string[]) => row.every((cell) => cell.trim() === '');

function parseArticle(value: string): Article | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
  return isArticle(normalized) ? normalized : null;
}

function parseType(value: string): WordType | null {
  const normalized = value.trim().toLowerCase();
  return isWordType(normalized) ? normalized : null;
}

/** Map each known column to its index. Returns an error message for an invalid header. */
function readHeader(header: string[]): { columns: Partial<Record<CsvColumn, number>>; warnings: string[] } | string {
  const names = header.map((cell) => cell.replace(BOM, '').trim().toLowerCase());

  const firstIndex = new Map<string, number>();
  for (const [i, name] of names.entries()) {
    if (!name) continue;
    const earlier = firstIndex.get(name);
    if (earlier !== undefined) {
      return `The column "${name}" appears more than once in the header (columns ${earlier + 1} and ${i + 1}). Remove the duplicate column. Nothing was imported.`;
    }
    firstIndex.set(name, i);
  }

  const missing = CSV_REQUIRED_COLUMNS.filter((c) => !firstIndex.has(c));
  if (missing.length) {
    const found = names.filter(Boolean);
    const wrongDelimiter = header.length === 1 && /[,;\t]/.test(header[0]);
    return [
      `The header row is missing the required column${missing.length > 1 ? 's' : ''} ${missing.map((c) => `"${c}"`).join(' and ')}.`,
      wrongDelimiter
        ? `Columns must be separated by "${CSV_DELIMITER}" – this file seems to use a different separator.`
        : found.length
          ? `Found: ${found.map((c) => `"${c}"`).join(', ')}.`
          : '',
      `The first line must be a header such as: ${CSV_TEMPLATE}. Nothing was imported.`,
    ]
      .filter(Boolean)
      .join(' ');
  }

  const columns: Partial<Record<CsvColumn, number>> = {};
  for (const column of CSV_COLUMNS) {
    const index = firstIndex.get(column);
    if (index !== undefined) columns[column] = index;
  }
  const unknown = [...firstIndex.keys()].filter((name) => !(CSV_COLUMNS as readonly string[]).includes(name));
  const warnings = unknown.length
    ? [`Ignored unknown column${unknown.length > 1 ? 's' : ''}: ${unknown.map((c) => `"${c}"`).join(', ')}.`]
    : [];
  return { columns, warnings };
}

/**
 * Validate and plan an import. Pure: nothing is written here. A header problem
 * returns { ok: false } so the caller writes nothing at all.
 */
export function planCsvImport(text: string, existing: VocabWord[]): CsvParseResult {
  const { data } = Papa.parse<string[]>(text, { delimiter: CSV_DELIMITER, skipEmptyLines: false });
  const rows = data.map((row) => row.map((cell) => cell ?? ''));

  const headerIndex = rows.findIndex((row) => !isBlank(row));
  if (headerIndex === -1) return { ok: false, error: 'The file is empty. Nothing was imported.' };

  const header = readHeader(rows[headerIndex]);
  if (typeof header === 'string') return { ok: false, error: header };
  const { columns, warnings } = header;
  const cell = (row: string[], column: CsvColumn) => {
    const index = columns[column];
    return index === undefined ? '' : (row[index] ?? '').trim();
  };

  const plan: CsvImportPlan = {
    words: [],
    completeCount: 0,
    draftCount: 0,
    duplicates: [],
    errors: [],
    invalidValues: [],
    warnings,
  };
  const existingKeys = new Set(existing.map((w) => spanishKey(w.spanish)));
  const firstRowInFile = new Map<string, number>();

  rows.forEach((row, index) => {
    if (index <= headerIndex || isBlank(row)) return;
    const rowNumber = index + 1;

    const spanish = cell(row, 'spanish');
    if (!spanish) {
      plan.errors.push({ row: rowNumber, message: 'the Spanish word is empty' });
      return;
    }
    const english = cell(row, 'english');
    const plural = cell(row, 'plural');
    const tooLong = (['spanish', 'english', 'plural'] as const).filter((c) => cell(row, c).length > MAX_LENGTH);
    if (tooLong.length) {
      plan.errors.push({ row: rowNumber, message: `${tooLong.join(', ')} longer than ${MAX_LENGTH} characters` });
      return;
    }

    const key = spanishKey(spanish);
    if (existingKeys.has(key)) {
      plan.duplicates.push({ row: rowNumber, message: `"${spanish}" is already in your vocabulary` });
      return;
    }
    const firstRow = firstRowInFile.get(key);
    if (firstRow !== undefined) {
      plan.duplicates.push({ row: rowNumber, message: `"${spanish}" already appears in row ${firstRow}` });
      return;
    }
    firstRowInFile.set(key, rowNumber);

    const typeValue = cell(row, 'type');
    const type = typeValue ? parseType(typeValue) : null;
    if (typeValue && !type) {
      plan.invalidValues.push({ row: rowNumber, message: `unknown type "${typeValue}" – imported without a type` });
    }

    // Article and plural only apply to nouns; on other rows they are ignored.
    let article: Article | null = null;
    if (type === 'noun') {
      const articleValue = cell(row, 'article');
      article = articleValue ? parseArticle(articleValue) : null;
      if (articleValue && !article) {
        plan.invalidValues.push({ row: rowNumber, message: `unknown article "${articleValue}" – imported without an article` });
      }
    }

    const word: WordInput = {
      spanish,
      english,
      ...(type && { type }),
      ...(article && { article }),
      ...(type === 'noun' && plural && { plural }),
    };
    plan.words.push(word);
    if (isComplete(word)) plan.completeCount++;
    else plan.draftCount++;
  });

  return { ok: true, plan };
}

/** Serialize words in the import format (so an export can be re-imported). */
export function wordsToCsv(words: VocabWord[]): string {
  return Papa.unparse(
    {
      fields: [...CSV_COLUMNS],
      data: words.map((w) => [w.spanish, w.english, w.type ?? '', w.article ?? '', w.plural ?? '']),
    },
    { delimiter: CSV_DELIMITER },
  );
}
