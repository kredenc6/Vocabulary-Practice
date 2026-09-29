import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CONJUGATION_GROUPS, PERSONS, personApplies, personLabel } from '../../constants/conjugation';
import type { Conjugations, FormsGroupConfig, GroupConfig, PersonsGroupConfig } from '../../constants/conjugation';
import {
  MAX_FORM_LENGTH,
  countGroupForms,
  countTenseForms,
  getPersonForm,
  getSingleForm,
  setPersonForm,
  setSingleForm,
} from '../../lib/conjugations';

interface Props {
  /** The infinitive, shown in the title. */
  infinitive: string;
  conjugations: Conjugations;
  /** Apply the edited values to the word form (saved together with the word). */
  onDone: (conjugations: Conjugations) => void;
  onCancel: () => void;
}

const GROUPS = CONJUGATION_GROUPS as readonly GroupConfig[];

const inputProps = {
  className: 'input',
  lang: 'es',
  maxLength: MAX_FORM_LENGTH,
  autoComplete: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
} as const;

function Count({ value }: { value: number }) {
  return value > 0 ? <span className="conj-tab-count">{value}</span> : null;
}

/**
 * Editor for a verb's conjugations, generated entirely from CONJUGATION_GROUPS:
 * a group switcher, tense tabs for groups with several tenses, and the rows.
 * Rendered in a portal so its inputs are not inside the word <form>
 * (Enter in a conjugation field must not submit the word).
 */
export function ConjugationDialog({ infinitive, conjugations, onDone, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Conjugations>(conjugations);
  const [groupKey, setGroupKey] = useState(GROUPS[0].key);
  /** Selected tense per persons group, remembered when switching groups. */
  const [tenseByGroup, setTenseByGroup] = useState<Record<string, string>>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const group = GROUPS.find((g) => g.key === groupKey) ?? GROUPS[0];
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

      <div className="conj-groups" role="tablist" aria-label="Group">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={g.key === group.key}
            className="conj-group"
            onClick={() => setGroupKey(g.key)}
          >
            {g.label}
            <Count value={countGroupForms(draft, g)} />
          </button>
        ))}
      </div>

      {group.kind === 'persons' ? (
        <PersonsGroupEditor
          key={group.key}
          group={group}
          tense={tenseByGroup[group.key] ?? group.tenses[0].key}
          onTenseChange={(tense) => setTenseByGroup((t) => ({ ...t, [group.key]: tense }))}
          draft={draft}
          onChange={setDraft}
        />
      ) : (
        <FormsGroupEditor key={group.key} group={group} draft={draft} onChange={setDraft} />
      )}

      <div className="conj-footer">
        <span className="small muted">Empty fields are not saved. Changes are saved with the word.</span>
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onDone(draft)}>
            Done
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

interface PersonsGroupEditorProps {
  group: PersonsGroupConfig;
  tense: string;
  onTenseChange: (tense: string) => void;
  draft: Conjugations;
  onChange: (conjugations: Conjugations) => void;
}

/** Tense tabs (when the group has several tenses) and one row per person. */
function PersonsGroupEditor({ group, tense, onTenseChange, draft, onChange }: PersonsGroupEditorProps) {
  const tenseConfig = group.tenses.find((t) => t.key === tense) ?? group.tenses[0];
  const panelLabel = group.tenses.length > 1 ? `${group.label} – ${tenseConfig.label}` : group.label;

  return (
    <>
      {group.tenses.length > 1 && (
        <div className="conj-tabs" role="tablist" aria-label={`${group.label} tense`}>
          {group.tenses.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === tenseConfig.key}
              className="conj-tab"
              onClick={() => onTenseChange(t.key)}
            >
              {t.label}
              <Count value={countTenseForms(draft, group, t.key)} />
            </button>
          ))}
        </div>
      )}
      <div className="conj-body" role="tabpanel" aria-label={panelLabel}>
        {tenseConfig.note && <p className="small muted">{tenseConfig.note}</p>}
        <div className="conj-rows">
          {PERSONS.map((person) => {
            const applies = personApplies(group, person);
            return (
              <label key={person} className={`conj-row${applies ? '' : ' is-excluded'}`}>
                <span className="conj-person" lang="es">
                  {personLabel(group, person)}
                </span>
                <input
                  {...inputProps}
                  value={applies ? getPersonForm(draft, group.key, tenseConfig.key, person) : ''}
                  onChange={(e) => onChange(setPersonForm(draft, group.key, tenseConfig.key, person, e.target.value))}
                  disabled={!applies}
                  placeholder={applies ? '' : `Not used in the ${group.label.toLowerCase()}`}
                />
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
}

interface FormsGroupEditorProps {
  group: FormsGroupConfig;
  draft: Conjugations;
  onChange: (conjugations: Conjugations) => void;
}

/** Single (non-personal) forms, e.g. the gerund. */
function FormsGroupEditor({ group, draft, onChange }: FormsGroupEditorProps) {
  return (
    <div className="conj-body" role="tabpanel" aria-label={group.label}>
      {group.note && <p className="small muted">{group.note}</p>}
      <div className="conj-rows">
        {group.forms.map((form) => (
          <label key={form.key} className="conj-row">
            <span className="conj-person">{form.label}</span>
            <input
              {...inputProps}
              value={getSingleForm(draft, group.key, form.key)}
              onChange={(e) => onChange(setSingleForm(draft, group.key, form.key, e.target.value))}
              placeholder={form.placeholder}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
