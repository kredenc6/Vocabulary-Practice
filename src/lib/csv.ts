import Papa from 'papaparse';
import type { VocabWord, WordPairInput } from '../types';

export interface CsvImportPreview {
  /** New pairs that will be imported. */
  pairs: WordPairInput[];
  /** Pairs that already exist in the vocabulary (or repeat within the file). */
  duplicates: number;
  /** Rows that don't have both a Spanish and an English value. */
  invalidRows: number;
  headerSkipped: boolean;
}

const HEADER_NAMES = new Set(['spanish', 'español', 'espanol', 'es', 'english', 'inglés', 'ingles', 'en']);

function isHeaderRow(row: string[]): boolean {
  return row.slice(0, 2).some((cell) => HEADER_NAMES.has(cell.trim().toLowerCase()));
}

export function pairKey(pair: WordPairInput): string {
  return `${pair.spanish.trim().toLowerCase()}\u0000${pair.english.trim().toLowerCase()}`;
}

/** Parse a two-column CSV file (Spanish, English), with or without a header row. */
export function parseVocabCsv(file: File, existing: VocabWord[]): Promise<CsvImportPreview> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: 'greedy',
      complete: (result) => {
        const rows = result.data;
        if (rows.length === 0) {
          reject(new Error('The file is empty.'));
          return;
        }
        const headerSkipped = isHeaderRow(rows[0]);
        const dataRows = headerSkipped ? rows.slice(1) : rows;

        const seen = new Set(existing.map(pairKey));
        const pairs: WordPairInput[] = [];
        let duplicates = 0;
        let invalidRows = 0;

        for (const row of dataRows) {
          const spanish = (row[0] ?? '').trim();
          const english = (row[1] ?? '').trim();
          if (!spanish || !english || spanish.length > 300 || english.length > 300) {
            invalidRows++;
            continue;
          }
          const pair = { spanish, english };
          const key = pairKey(pair);
          if (seen.has(key)) {
            duplicates++;
            continue;
          }
          seen.add(key);
          pairs.push(pair);
        }

        resolve({ pairs, duplicates, invalidRows, headerSkipped });
      },
      error: (error) => reject(error),
    });
  });
}

/** Serialize words to a CSV string with a header row. */
export function wordsToCsv(words: VocabWord[]): string {
  return Papa.unparse({
    fields: ['Spanish', 'English'],
    data: words.map((w) => [w.spanish, w.english]),
  });
}
