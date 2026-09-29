# Word model

Words are stored per user at `users/{uid}/words/{wordId}`. The Firestore document id is the word id and is not stored as a field.

- Type: `VocabWordData` in [`src/types.ts`](../src/types.ts)
- Constants: [`src/constants/word.ts`](../src/constants/word.ts)
- Draft rule: [`src/lib/wordValidation.ts`](../src/lib/wordValidation.ts)
- Rules: [`firestore.rules`](../firestore.rules)

## Fields

| Field | Type | Notes |
| --- | --- | --- |
| `spanish` | string | **Required, non-empty.** The base form: a noun *without* its article (`casa`, not `la casa`), a verb's infinitive, or an adjective's masculine singular (four-form) / singular (two-form). |
| `english` | string | Translation. May be `""` while the word is a draft. |
| `type` | `WordType`? | See [Constants](#constants). Absent = not filled in. |
| `article` | `Article`? | Absent = not filled in. `not_used` = noun used without an article, which is **not** the same as absent. |
| `plural` | string? | Nouns only. Plural form without its article, at most 300 characters. |
| `conjugations` | `Conjugations`? | Verbs only, grouped: `conjugations[group][tense][person]` or `conjugations[group][form]`, with only non-empty values. The gerund is `conjugations.progressive.gerund`. See [Verb conjugations](#verb-conjugations). |
| `adjective` | `AdjectiveForms`? | Adjectives only. `{ kind: 'four', feminine?, masculinePlural?, femininePlural? }` or `{ kind: 'two', plural? }`. See [Adjective forms](#adjective-forms). |
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

- **Type-specific fields:** fields appear only for the type they belong to.
  - Nouns: article and plural. The Spanish label reads "Spanish (without article)".
  - Adjectives: the forms switch and inputs, with a label like "Spanish (masculine singular)".
  - Verbs: the "Conjugations (optional)" field next to Type (an "Edit…" button).
  - With no type or another type, the label is just "Spanish". Changing the type away from noun clears the article and plural.
- **Written article:** for nouns, an article typed at the start of the Spanish field (`un`, `una`, `el`, `la`, case-insensitive) is moved to the Article field once a character follows it and a space (`la c` → Spanish `c`, Article `la`). This happens while typing or pasting, and when the type is switched to noun with `la casa` already written. The written article wins over a selected one. A note says what happened: info "Article “la” moved…", or a warning "Article changed from “el” to “la”…" when it replaced a different article (including "not used"). The note hides once the article is changed by hand, the type changes, the Spanish field is emptied or the word is saved. Plural articles (`los`, `las`, `unos`, `unas`) are left as typed. Logic: `moveLeadingArticle` in [`src/lib/wordForm.ts`](../src/lib/wordForm.ts).
- **Saving:** needs only a non-empty Spanish word. The button reads "Add word" / "Save" for complete words and "Add to drafts" / "Save as draft" otherwise. A hint lists the missing fields.
- **On save:** values are trimmed. Article and plural are not saved for non-nouns. On edit, empty or non-applicable fields are removed with `deleteField()`.

## Adjective forms

Adjectives are either **four-form** or **two-form**, chosen with a switch in the word form. The config is [`src/constants/adjective.ts`](../src/constants/adjective.ts) (`ADJECTIVE_KINDS`), and the helpers are in [`src/lib/adjective.ts`](../src/lib/adjective.ts).

| Kind | `spanish` holds | Optional forms (stored keys) | Example |
| --- | --- | --- | --- |
| `four` | masculine singular | `feminine`, `masculinePlural`, `femininePlural` | bonito · bonita · bonitos · bonitas |
| `two` | singular | `plural` | verde · verdes |

- **Stored shape:** `adjective = { kind, ...forms }`. The kind is always stored for adjectives, so it records the switch even with no forms filled in. Forms are stored only when non-empty, and only those of the chosen kind.
- **Defaults and completeness:** an adjective without an `adjective` field (e.g. saved before this existed) opens as four-form. The forms and the kind don't affect completeness.
- **Cleaning:** `cleanAdjective()` is used by the form, the repository (before writing) and the converter (when reading). It keeps the valid kind plus that kind's trimmed forms of at most 300 characters. Updates replace the whole `adjective` map; an empty result is removed with `deleteField()`.
- **Editing:** when type is `adjective`, the form shows the "Gender" switch next to Type ("Specific" = four-form, "Neutral" = two-form) and that kind's inputs. The Spanish field's label follows the kind ("masculine singular" / "singular").
  - Values typed for the other kind stay in the form while editing but aren't saved.
  - If the type is changed away from adjective, the forms are removed on save.
- **Adding a kind or form:** add it to `ADJECTIVE_KINDS`. The types, form inputs, display and cleaning follow. Also update `isValidAdjective()` in `firestore.rules`.
- CSV import/export doesn't include adjective forms (yet).

## Verb conjugations

A verb's `spanish` is its infinitive (not validated). Conjugations are **data only**: they aren't shown in practice, and they don't affect completeness, so a verb with just an infinitive is complete.

### Groups

[`src/constants/conjugation.ts`](../src/constants/conjugation.ts) is the single source of truth. `CONJUGATION_GROUPS` is an ordered list of groups of two kinds:

- **`persons` groups** have tenses, each with one form per person. They're stored as `conjugations[group][tense][person]`. A group can exclude persons (shown disabled, never stored) and relabel them. A tense can carry a short `note` shown in the editor.
- **`forms` groups** have a few single, non-personal forms. They're stored as `conjugations[group][form]`.

| Group | Kind | Tenses / forms | Notes |
| --- | --- | --- | --- |
| `indicative` | persons | `present`, `preterite`, `imperfect`, `conditional`, `future` | all six persons |
| `imperative` | persons | `affirmative`, `negative` | excludes `yo`; `el` / `ellos` labelled "Ud." / "Uds."; negative forms include "no" (e.g. "no hables") |
| `progressive` | forms | `gerund` | e.g. "trabajando"; the estar + gerund forms are generated, not stored |

`PERSONS` are `yo`, `tu`, `el`, `nosotros`, `vosotros`, `ellos`, labelled "yo", "tú", "él/ella/Ud.", "nosotros", "vosotros", "ellos/ellas/Uds.". Keys are ASCII and stored; labels are UI-only.

Example document value:

```json
{
  "indicative": { "present": { "yo": "hablo", "tu": "hablas" } },
  "imperative": { "affirmative": { "tu": "habla" }, "negative": { "tu": "no hables" } },
  "progressive": { "gerund": "hablando" }
}
```

The `Conjugations` TypeScript type is derived from the config, so `word.conjugations?.indicative?.present?.yo` is type-checked, and unknown groups, tenses or persons are compile errors.

### Adding a group

To add a group (e.g. subjunctive with `present`/`imperfect`, or perfect with a `participle` form):

1. Add one entry to `CONJUGATION_GROUPS`. The types, the editor (group switcher, tense tabs, rows), counting and cleaning all follow automatically.
2. In `firestore.rules`, add the group key to the `hasOnly()` list in `isValidConjugations()`, plus one `isValid_<group>()` function. Rules can't loop, so each group's tenses or forms are listed explicitly; copy an existing function. The rules check only the keys (group / tense / person), not each person's value: validating every value exceeds Firestore's limit of 1,000 evaluated expressions per request and makes every write with conjugations fail. Keep new checks cheap for the same reason, and publish the rules after changing them.

Group keys keep tense names from colliding: `subjunctive.present` is distinct from `indicative.present`.

### Cleaning and saving

[`src/lib/conjugations.ts`](../src/lib/conjugations.ts) is config-driven: `cleanConjugations`, `get/setPersonForm`, `get/setSingleForm` and the counters. The form, the repository (before writing) and the converter (when reading) all use `cleanConjugations`. It keeps only configured groups, tenses and forms, and only persons that apply, with trimmed non-empty strings of at most 300 characters.

- An empty result means the field is omitted on create and removed with `deleteField()` on update.
- Updates replace the whole `conjugations` map.
- Data in any other shape, e.g. the earlier flat `conjugations[tense]` and top-level `gerund`, reads as empty.

### Editing

When type is `verb`, the shared form shows a "Conjugations (optional)" field next to Type with an "Edit…" button and a count of filled forms. It opens a dialog with a group switcher (Indicative / Imperative / Progressive), tense tabs for groups with several tenses, and the rows. The selected tense is remembered per group, and filled counts are shown on both groups and tenses.

- **Done** applies the changes to the form; they're saved with the word. **Cancel** or Escape discards them.
- If the type is changed away from verb, the conjugations stay in the form while editing but are removed on save.
- **Paste table…** (groups with `tablePaste: true` in the config – currently Indicative and Imperative) fills the whole group from a copied conjugation table: the column headings first (any of the group's tense labels, e.g. Present or Affirmative, in any order), then each person followed by one form per column. Cells may be on separate lines or tab-separated; person names are matched leniently ("tu" = "tú", "él/ella/Ud." / "usted" = él). A dash cell ("-", "–", "—") means no form and is not filled. Persons the group doesn't use (yo in the imperative) may appear, but only with dash cells; they're skipped. The text is checked live – what was found, how many filled forms would be replaced, or what's wrong – and **Fill forms** writes it into the dialog (forms missing from the table are kept). Parsing is `parseConjugationTable` in [`src/lib/conjugations.ts`](../src/lib/conjugations.ts).

## Display and grading

- **`formatSpanish(word)`** ([`src/lib/wordDisplay.ts`](../src/lib/wordDisplay.ts)) returns `article + " " + spanish`, or just `spanish` when the article is absent or `not_used`. Examples: "un hombre", "una maleta", "México". Use it everywhere the Spanish word is shown to the learner: practice prompts, flashcards, multiple-choice options, feedback, lists and messages.
- **Typed English → Spanish:** the expected answer is `formatSpanish(word)`, so the article belongs in the answer. The comparison logic in [`answerCheck.ts`](../src/lib/answerCheck.ts) is unchanged: a missing or wrong article is graded "close enough", with a hint.
- **Plural and adjective forms:** shown as small muted text ("pl. hombres"; "f. bonita m. pl. bonitos f. pl. bonitas"; "pl. verdes") by the `SpanishWord` / `WordSide` components ([`src/components/SpanishWord.tsx`](../src/components/SpanishWord.tsx)), and only where the Spanish word itself is visible.
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
