import { useId, useState } from 'react';
import type { FormEvent, ReactNode, Ref } from 'react';
import { ADJECTIVE_KINDS, adjectiveKindConfig } from '../../constants/adjective';
import type { AdjectiveFormKey } from '../../constants/adjective';
import { ARTICLES, ARTICLE_LABELS, WORD_TYPES, WORD_TYPE_LABELS, isArticle, isWordType } from '../../constants/word';
import { countForms } from '../../lib/conjugations';
import { adjectiveFieldsApply, formCompletenessFields, nounFieldsApply, verbFieldsApply, withType } from '../../lib/wordForm';
import type { WordFormValues } from '../../lib/wordForm';
import { MANDATORY_FIELD_LABELS, getMissingFields } from '../../lib/wordValidation';
import { ConjugationDialog } from './ConjugationDialog';

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
  const isVerb = verbFieldsApply(values.type);
  const isAdjective = adjectiveFieldsApply(values.type);
  const adjectiveKind = adjectiveKindConfig(values.adjective.kind);
  const adjectiveRadioName = useId();
  const [conjugationsOpen, setConjugationsOpen] = useState(false);
  const formCount = countForms(values.conjugations);
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
          <span className="field-label">
            {isNoun
              ? 'Spanish (without article)'
              : isAdjective
                ? `Spanish (${adjectiveKind.baseLabel})`
                : 'Spanish'}
          </span>
          <input
            ref={spanishRef}
            className="input"
            value={values.spanish}
            onChange={(e) => set({ spanish: e.target.value })}
            placeholder={isAdjective ? adjectiveKind.basePlaceholder : 'manzana'}
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
        {/* Adjectives only: four-form / two-form switch, next to Type. */}
        {isAdjective && (
          <div className="field span-4">
            <span id={adjectiveRadioName} className="field-label">
              Gender
            </span>
            <div className="segmented" role="radiogroup" aria-labelledby={adjectiveRadioName}>
              {ADJECTIVE_KINDS.map((kind) => (
                <label key={kind.key} className="segmented-option" title={kind.example}>
                  <input
                    type="radio"
                    name={adjectiveRadioName}
                    checked={values.adjective.kind === kind.key}
                    onChange={() => set({ adjective: { ...values.adjective, kind: kind.key } })}
                  />
                  {kind.label}
                </label>
              ))}
            </div>
          </div>
        )}
        {/* Nouns only; switching away from noun clears them (see withType). */}
        {isNoun && (
          <>
            <label className="field span-2">
              <span className="field-label">Article</span>
              <select
                className="input"
                value={values.article}
                onChange={(e) => set({ article: isArticle(e.target.value) ? e.target.value : '' })}
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
              <span className="field-label">Plural (optional)</span>
              <input
                className="input"
                value={values.plural}
                onChange={(e) => set({ plural: e.target.value })}
                placeholder="manzanas"
                lang="es"
                maxLength={300}
              />
            </label>
          </>
        )}
      </div>

      {/* Adjectives only: the optional other forms of the selected kind. */}
      {isAdjective && (
        <div className="word-form-grid">
          {adjectiveKind.forms.map((form) => (
            <label key={form.key} className="field span-2">
              <span className="field-label">{form.label} (optional)</span>
              <input
                className="input"
                value={values.adjective[form.key as AdjectiveFormKey]}
                onChange={(e) => set({ adjective: { ...values.adjective, [form.key]: e.target.value } })}
                placeholder={form.placeholder}
                lang="es"
                maxLength={300}
              />
            </label>
          ))}
        </div>
      )}

      {/* Verbs only. Conjugations don't affect completeness and aren't used in practice (yet). */}
      {isVerb && (
        <div className="word-form-extra">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConjugationsOpen(true)}>
            Conjugations…
            {formCount > 0 && (
              <span className="count-pill" aria-label={`${formCount} filled`}>
                {formCount}
              </span>
            )}
          </button>
          <span className="small muted">Optional</span>
        </div>
      )}
      {conjugationsOpen && (
        <ConjugationDialog
          infinitive={values.spanish}
          conjugations={values.conjugations}
          onDone={(conjugations) => {
            onChange({ ...values, conjugations });
            setConjugationsOpen(false);
          }}
          onCancel={() => setConjugationsOpen(false)}
        />
      )}

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
