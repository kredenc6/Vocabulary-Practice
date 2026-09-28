import type { FormEvent, ReactNode, Ref } from 'react';
import { ARTICLES, ARTICLE_LABELS, WORD_TYPES, WORD_TYPE_LABELS, isArticle, isWordType } from '../../constants/word';
import { formCompletenessFields, nounFieldsApply, withType } from '../../lib/wordForm';
import type { WordFormValues } from '../../lib/wordForm';
import { MANDATORY_FIELD_LABELS, getMissingFields } from '../../lib/wordValidation';

interface Props {
  values: WordFormValues;
  onChange: (values: WordFormValues) => void;
  /** Called only when the form can be saved (the Spanish word is non-empty). */
  onSubmit: () => void;
  /** Button text for a complete word and for a draft. */
  submitLabels: { complete: string; draft: string };
  spanishRef?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
  /** Extra buttons after the submit button (e.g. Cancel). */
  children?: ReactNode;
}

/** Shared add/edit form. Incomplete words can be saved as drafts. */
export function WordForm({ values, onChange, onSubmit, submitLabels, spanishRef, autoFocus, children }: Props) {
  const isNoun = nounFieldsApply(values.type);
  const missing = getMissingFields(formCompletenessFields(values));
  const complete = missing.length === 0;
  const canSubmit = values.spanish.trim() !== '';

  const set = (patch: Partial<WordFormValues>) => onChange({ ...values, ...patch });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) onSubmit();
  };

  return (
    <form className="word-form" onSubmit={handleSubmit}>
      <div className="word-form-grid">
        <label className="field span-3">
          <span className="field-label">Spanish (without article)</span>
          <input
            ref={spanishRef}
            className="input"
            value={values.spanish}
            onChange={(e) => set({ spanish: e.target.value })}
            placeholder="manzana"
            lang="es"
            maxLength={300}
            autoFocus={autoFocus}
            required
          />
        </label>
        <label className="field span-3">
          <span className="field-label">English</span>
          <input
            className="input"
            value={values.english}
            onChange={(e) => set({ english: e.target.value })}
            placeholder="apple"
            lang="en"
            maxLength={300}
          />
        </label>
        <label className="field span-2">
          <span className="field-label">Type</span>
          <select
            className="input"
            value={values.type}
            onChange={(e) => onChange(withType(values, isWordType(e.target.value) ? e.target.value : ''))}
          >
            <option value="">Select type…</option>
            {WORD_TYPES.map((t) => (
              <option key={t} value={t}>
                {WORD_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="field span-2">
          <span className="field-label">Article{!isNoun && ' (nouns only)'}</span>
          <select
            className="input"
            value={values.article}
            onChange={(e) => set({ article: isArticle(e.target.value) ? e.target.value : '' })}
            disabled={!isNoun}
          >
            <option value="">Select article…</option>
            {ARTICLES.map((a) => (
              <option key={a} value={a}>
                {ARTICLE_LABELS[a]}
              </option>
            ))}
          </select>
        </label>
        <label className="field span-2">
          <span className="field-label">Plural{isNoun ? ' (optional)' : ' (nouns only)'}</span>
          <input
            className="input"
            value={values.plural}
            onChange={(e) => set({ plural: e.target.value })}
            placeholder={isNoun ? 'manzanas' : ''}
            lang="es"
            maxLength={300}
            disabled={!isNoun}
          />
        </label>
      </div>

      <div className="word-form-footer">
        <p className="small muted" role="status">
          {complete
            ? 'Complete – ready to practice.'
            : `Missing: ${missing.map((f) => MANDATORY_FIELD_LABELS[f]).join(', ')}.${canSubmit ? ' Will be saved as a draft.' : ''}`}
        </p>
        <div className="row">
          <button type="submit" className={`btn ${complete ? 'btn-primary' : 'btn-secondary'}`} disabled={!canSubmit}>
            {complete ? submitLabels.complete : submitLabels.draft}
          </button>
          {children}
        </div>
      </div>
    </form>
  );
}
