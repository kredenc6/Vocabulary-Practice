import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PERSONS, TENSES, personApplies, personLabel, tenseLabel } from '../../constants/conjugation';
import type { Conjugations, Person, Tense } from '../../constants/conjugation';
import { MAX_FORM_LENGTH, countTenseForms } from '../../lib/conjugations';

interface Props {
  /** The infinitive, shown in the title. */
  infinitive: string;
  conjugations: Conjugations;
  gerund: string;
  /** Apply the edited values to the word form (saved together with the word). */
  onDone: (conjugations: Conjugations, gerund: string) => void;
  onCancel: () => void;
}

/**
 * Editor for a verb's conjugations, generated entirely from TENSE_CONFIG.
 * Rendered in a portal so its inputs are not inside the word <form>
 * (Enter in a conjugation field must not submit the word).
 */
export function ConjugationDialog({ infinitive, conjugations, gerund, onDone, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Conjugations>(conjugations);
  const [gerundDraft, setGerundDraft] = useState(gerund);
  const [tense, setTense] = useState<Tense>(TENSES[0]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const setForm = (person: Person, value: string) =>
    setDraft((d) => ({ ...d, [tense]: { ...d[tense], [person]: value } }));

  const title = infinitive.trim() ? `Conjugations – ${infinitive.trim()}` : 'Conjugations';

  return createPortal(
    <dialog
      ref={dialogRef}
      className="conj-dialog"
      aria-labelledby="conj-dialog-title"
      onCancel={(event) => {
        // Escape: close via React state so the dialog unmounts cleanly.
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="conj-header">
        <h2 id="conj-dialog-title" lang="es">
          {title}
        </h2>
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Close without applying">
          ✕
        </button>
      </div>

      <div className="conj-tabs" role="tablist" aria-label="Tense">
        {TENSES.map((t) => {
          const count = countTenseForms(draft, t);
          return (
            <button
              key={t}
              type="button"
              role="tab"
              id={`conj-tab-${t}`}
              aria-selected={t === tense}
              aria-controls="conj-panel"
              className="conj-tab"
              onClick={() => setTense(t)}
            >
              {tenseLabel(t)}
              {count > 0 && <span className="conj-tab-count">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="conj-body">
        <div id="conj-panel" role="tabpanel" aria-labelledby={`conj-tab-${tense}`} className="conj-rows">
          {PERSONS.map((person) => {
            const applies = personApplies(tense, person);
            return (
              <label key={person} className={`conj-row${applies ? '' : ' is-excluded'}`}>
                <span className="conj-person" lang="es">
                  {personLabel(tense, person)}
                </span>
                <input
                  className="input"
                  value={applies ? (draft[tense]?.[person] ?? '') : ''}
                  onChange={(e) => setForm(person, e.target.value)}
                  disabled={!applies}
                  placeholder={applies ? '' : `Not used in the ${tenseLabel(tense).toLowerCase()}`}
                  lang="es"
                  maxLength={MAX_FORM_LENGTH}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </label>
            );
          })}
        </div>

        <label className="conj-row conj-gerund">
          <span className="conj-person">Gerund</span>
          <input
            className="input"
            value={gerundDraft}
            onChange={(e) => setGerundDraft(e.target.value)}
            placeholder="e.g. trabajando"
            lang="es"
            maxLength={MAX_FORM_LENGTH}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </label>
      </div>

      <div className="conj-footer">
        <span className="small muted">Empty fields are not saved. Changes are saved with the word.</span>
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onDone(draft, gerundDraft)}>
            Done
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
