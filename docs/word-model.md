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

Drafts never reach practice or statistics. `WordsContext.practiceWords` is the complete-words list and is the only list practice and statistics code may use. `WordsContext.words` holds everything, drafts included; it's used for the vocabulary list, duplicate checks and CSV export.

## Constants

Defined as `as const` arrays with derived union types (no enums). The UI uses the label maps.

| Constant | Values | Label map |
| --- | --- | --- |
| `WORD_TYPES` → `WordType` | `noun`, `verb`, `adjective`, `adverb`, `pronoun`, `preposition`, `conjunction`, `interjection`, `phrase` | `WORD_TYPE_LABELS` |
| `ARTICLES` → `Article` | `un`, `una`, `el`, `la`, `not_used` | `ARTICLE_LABELS` (`not_used` → "not used") |

Type guards: `isWordType(value)` and `isArticle(value)`.

`firestore.rules` repeats both lists in `wordTypes()` and `articles()`. **Change them together.**
