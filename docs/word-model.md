# Word model

Words are stored per user at `users/{uid}/words/{wordId}`. The Firestore document id is the word id and is not stored as a field.

- Type: `VocabWordData` in [`src/types.ts`](../src/types.ts)
- Constants: [`src/constants/word.ts`](../src/constants/word.ts)
- Draft rule: [`src/lib/wordValidation.ts`](../src/lib/wordValidation.ts)
- Rules: [`firestore.rules`](../firestore.rules)

## Fields

| Field | Type | Notes |
| --- | --- | --- |
| `spanish` | string | **Required, non-empty.** The word *without* its article (`casa`, not `la casa`). |
| `english` | string | Translation. May be `""` while the word is a draft. |
| `type` | `WordType`? | See [Constants](#constants). Absent = not filled in. |
| `article` | `Article`? | Absent = not filled in. `not_used` = noun used without an article, which is **not** the same as absent. |
| `plural` | string? | Plural form without its article, at most 300 characters. |
| `conjugations` | `Conjugations`? | Verbs only. `conjugations[tense][person] = form`, only non-empty values. See [Verb conjugations](#verb-conjugations). |
| `gerund` | string? | Verbs only, e.g. "trabajando". The estar + gerund forms are generated, not stored. |
| `schemaVersion` | int | Always written as `WORD_SCHEMA_VERSION` (currently `1`) on every create and update. |
| `createdAt`, `updatedAt` | int | Epoch milliseconds. |
| `easeFactor`, `interval`, `repetitions`, `nextReviewDate`, `lastReviewedAt`, `lapses`, `totalReviews`, `correctReviews` | numbers | Spaced-repetition state (SM-2), see [`src/lib/srs.ts`](../src/lib/srs.ts). |

### Writing optional fields

- `undefined` is never written to Firestore.
- **Create:** absent optional fields are omitted from the document. An empty `plural` counts as absent.
- **Update** (`WordUpdate`): an omitted key leaves the field unchanged. `null` (or an empty `plural`) removes the field with `deleteField()`.
- **Read:** the converter in [`src/firebase/paths.ts`](../src/firebase/paths.ts) tolerates missing fields. Unknown `type` or `article` values read as absent.

## Draft rule

A word is **complete** when all of these hold:

1. `spanish` is non-empty after trimming.
2. `english` is non-empty after trimming.
3. `type` is set.
4. If `type` is `noun`, `article` is set. `not_used` counts as set.

Anything else is a **draft**. The status is always derived with `isComplete` / `isDraft` / `getMissingFields` and is never stored.

Drafts never reach practice or statistics. `WordsContext` provides three derived lists:

- `practiceWords`: complete words only. It's the only list practice and statistics code may use, and the main Vocabulary list shows it.
- `draftWords`: drafts only. The Drafts tab shows it, and its size is the nav badge.
- `words`: everything. It's used for duplicate checks and CSV export.

Saving a word through the shared form moves it between Vocabulary and Drafts automatically, because the status is derived. Draft rows show `MISSING_FIELD_TAGS` (e.g. "no type") from `getMissingFields`.

## Add/edit form

Adding and editing use one shared form: [`WordForm`](../src/components/vocabulary/WordForm.tsx). Conversions live in [`src/lib/wordForm.ts`](../src/lib/wordForm.ts).

- **Enabled fields:** article and plural are enabled only when type is `noun`. Changing the type away from noun clears them.
- **Saving:** needs only a non-empty Spanish word. The button reads "Add word" / "Save" for complete words and "Add to drafts" / "Save as draft" otherwise. A hint lists the missing fields.
- **On save:** values are trimmed. Article and plural are not saved for non-nouns. On edit, empty or non-applicable fields are removed with `deleteField()`.

## Verb conjugations

A verb's `spanish` is its infinitive (not validated). Conjugations are **data only**: they aren't shown in practice, and they don't affect completeness, so a verb with just an infinitive is complete.

- **Config:** [`src/constants/conjugation.ts`](../src/constants/conjugation.ts) is the single source of truth.
  - `TENSE_CONFIG` is an ordered list of `{ key, label, excludedPersons?, personLabels? }`. The tenses are present, preterite, imperfect, conditional, future and imperative.
  - `PERSONS` are `yo`, `tu`, `el`, `nosotros`, `vosotros`, `ellos`, labelled "yo", "tú", "él/ella/Ud.", "nosotros", "vosotros", "ellos/ellas/Uds.".
  - The imperative excludes `yo` and labels `el` / `ellos` as "Ud." / "Uds.".
  - Keys are ASCII and stored; labels are UI-only.
- **Adding a tense** (e.g. subjunctive): add one `TENSE_CONFIG` entry. The `Tense` type, the editor tabs and rows, and the cleaning logic follow automatically. Also add the key to `tenses()` and a check line to `isValidConjugations()` in `firestore.rules`.
- **Cleaning:** [`src/lib/conjugations.ts`](../src/lib/conjugations.ts) (`cleanConjugations`, `cleanGerund`) is used by the form, the repository before writing, and the converter when reading. It keeps only known tenses and persons that apply, with trimmed non-empty strings of at most 300 characters. An empty result means the field is omitted on create and removed with `deleteField()` on update. Updates replace the whole `conjugations` map.
- **Editing:** when type is `verb`, the shared form shows a "Conjugations…" button with a count of filled forms. It opens a dialog with one tab per tense, and excluded persons appear disabled.
  - **Done** applies the changes to the form; they're saved with the word. **Cancel** or Escape discards them.
  - If the type is changed away from verb, the conjugations stay in the form while editing but are removed on save.

## Display and grading

- **`formatSpanish(word)`** ([`src/lib/wordDisplay.ts`](../src/lib/wordDisplay.ts)) returns `article + " " + spanish`, or just `spanish` when the article is absent or `not_used`. Examples: "un hombre", "una maleta", "México". Use it everywhere the Spanish word is shown to the learner: practice prompts, flashcards, multiple-choice options, feedback, lists and messages.
- **Typed English → Spanish:** the expected answer is `formatSpanish(word)`, so the article belongs in the answer. The comparison logic in [`answerCheck.ts`](../src/lib/answerCheck.ts) is unchanged: a missing or wrong article is graded "close enough", with a hint.
- **Plural:** shown as small muted text ("pl. hombres") by the `SpanishWord` / `WordSide` components ([`src/components/SpanishWord.tsx`](../src/components/SpanishWord.tsx)), and only where the Spanish word itself is visible.
  - It never appears in an English → Spanish prompt before the answer is revealed.
  - It's never graded, never a multiple-choice option, and never affects SRS or statistics.
- **Type** is never displayed in practice.

## CSV import and export

Code: [`src/lib/csv.ts`](../src/lib/csv.ts) and [`CsvImport.tsx`](../src/components/vocabulary/CsvImport.tsx).

- **Format:** UTF-8, fixed delimiter `|`, and a required header row whose names are the stored field names: `spanish`, `english` (required), `type`, `article`, `plural` (optional). Headers match after trimming, case-insensitively, in any order. A UTF-8 BOM is stripped.
- **Reading:** the file is decoded as UTF-8 (`file.text()`). If it contains U+FFFD, it isn't UTF-8 and nothing is imported.
- **Header errors** (a missing required column, a duplicated column name) stop the import before anything is written. Unknown columns are ignored with a warning.
- **Rows:**
  - An empty `spanish`, or a value longer than 300 characters, is a row error and the row is skipped.
  - Every other row is stored. It's a draft when `isComplete()` is false.
  - `type` and `article` are case-insensitive; `article` also accepts "not used". An invalid value counts as missing and is reported.
  - `article` and `plural` are ignored on non-nouns.
  - Fully blank lines are skipped silently.
- **Duplicates:** matched on `spanish` only (trimmed, case-insensitive), against existing words and earlier rows. The first occurrence wins.
- **Planning then writing:** `planCsvImport()` is pure and builds the whole plan in memory. The UI shows it as a preview, and only "Import" writes, via `importWords` (batches of 400, fresh review schedule). The same report is shown afterwards.
- **Export** writes the same format, so an exported file can be imported again.

## Constants

Defined as `as const` arrays with derived union types (no enums). The UI uses the label maps.

| Constant | Values | Label map |
| --- | --- | --- |
| `WORD_TYPES` → `WordType` | `noun`, `verb`, `adjective`, `adverb`, `pronoun`, `preposition`, `conjunction`, `interjection`, `phrase` | `WORD_TYPE_LABELS` |
| `ARTICLES` → `Article` | `un`, `una`, `el`, `la`, `not_used` | `ARTICLE_LABELS` (`not_used` → "not used") |

Type guards: `isWordType(value)` and `isArticle(value)`.

`firestore.rules` repeats both lists in `wordTypes()` and `articles()`. **Change them together.**
