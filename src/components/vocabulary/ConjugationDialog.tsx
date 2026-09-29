import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CONJUGATION_GROUPS, PERSONS, personApplies, personLabel } from '../../constants/conjugation';
import type { Conjugations, FormsGroupConfig, GroupConfig, PersonsGroupConfig } from '../../constants/conjugation';
import {
  MAX_FORM_LENGTH,
  applyParsedForms,
  countGroupForms,
  countReplacedForms,
  countTenseForms,
  getPersonForm,
  getSingleForm,
  parseConjugationTable,
  setPersonForm,
  setSingleForm,
} from '../../lib/conjugations';
import type { ParsedTable } from '../../lib/conjugations';

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
  /** Pasted table text; null when not pasting. */
  const [pasteText, setPasteText] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const group = GROUPS.find((g) => g.key === groupKey) ?? GROUPS[0];
  const title = infinitive.trim() ? `Conjugations – ${infinitive.trim()}` : 'Conjugations';
  const pasting = pasteText !== null && group.kind === 'persons';
  const parsed = pasting ? parseConjugationTable(pasteText, group) : null;

  const fillFromTable = () => {
    if (!parsed?.ok) return;
    setDraft(applyParsedForms(draft, group.key, parsed.forms));
    setPasteText(null);
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className="conj-dialog"
      aria-labelledby="conj-dialog-title"
      onCancel={(event) => {
        // Escape: leave pasting, or close via React state so the dialog unmounts cleanly.
        event.preventDefault();
        if (pasting) setPasteText(null);
        else onCancel();
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
            onClick={() => {
              setGroupKey(g.key);
              setPasteText(null);
            }}
          >
            {g.label}
            <Count value={countGroupForms(draft, g)} />
          </button>
        ))}
      </div>

      {pasting ? (
        <TablePastePanel
          group={group}
          text={pasteText}
          onTextChange={setPasteText}
          parsed={parsed}
          replaced={parsed?.ok ? countReplacedForms(draft, group.key, parsed.forms) : 0}
        />
      ) : group.kind === 'persons' ? (
        <PersonsGroupEditor
          key={group.key}
          group={group}
          tense={tenseByGroup[group.key] ?? group.tenses[0].key}
          onTenseChange={(tense) => setTenseByGroup((t) => ({ ...t, [group.key]: tense }))}
          draft={draft}
          onChange={setDraft}
          onPasteTable={() => setPasteText('')}
        />
      ) : (
        <FormsGroupEditor key={group.key} group={group} draft={draft} onChange={setDraft} />
      )}

      <div className="conj-footer">
        {pasting ? (
          <>
            <span className="small muted">Forms missing from the table are kept.</span>
            <div className="row">
              <button type="button" className="btn btn-ghost" onClick={() => setPasteText(null)}>
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={fillFromTable} disabled={!parsed?.ok}>
                Fill forms
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="small muted">Empty fields are not saved. Changes are saved with the word.</span>
            <div className="row">
              <button type="button" className="btn btn-ghost" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => onDone(draft)}>
                Done
              </button>
            </div>
          </>
        )}
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
  onPasteTable: () => void;
}

/** Tense tabs (when the group has several tenses), the "Paste table" button and one row per person. */
function PersonsGroupEditor({ group, tense, onTenseChange, draft, onChange, onPasteTable }: PersonsGroupEditorProps) {
  const tenseConfig = group.tenses.find((t) => t.key === tense) ?? group.tenses[0];
  const panelLabel = group.tenses.length > 1 ? `${group.label} – ${tenseConfig.label}` : group.label;

  return (
    <>
      {(group.tenses.length > 1 || group.tablePaste) && (
        <div className="conj-tabs">
          {group.tenses.length > 1 && (
            <div className="conj-tab-list" role="tablist" aria-label={`${group.label} tense`}>
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
          {group.tablePaste && (
            <button type="button" className="btn btn-ghost btn-sm conj-paste-btn" onClick={onPasteTable}>
              Paste table…
            </button>
          )}
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

interface TablePastePanelProps {
  group: PersonsGroupConfig;
  text: string;
  onTextChange: (text: string) => void;
  parsed: ParsedTable | null;
  /** Filled forms the table would overwrite with a different value. */
  replaced: number;
}

/** Textarea for a copied conjugation table, with a live check of what it fills. */
function TablePastePanel({ group, text, onTextChange, parsed, replaced }: TablePastePanelProps) {
  const tenseLabels = group.tenses.map((t) => t.label).join(', ');

  return (
    <div className="conj-body" role="region" aria-label={`Paste ${group.label.toLowerCase()} table`}>
      <p id="conj-paste-hint" className="small muted">
        Paste a conjugation table: the tense names first ({tenseLabels} – in any order, some may be left out), then
        each person followed by one form per tense. Cells can be on separate lines or separated by tabs.
      </p>
      <textarea
        className="input conj-paste-input"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        rows={12}
        lang="es"
        spellCheck={false}
        autoFocus
        aria-label="Conjugation table"
        aria-describedby="conj-paste-hint conj-paste-status"
      />
      <p id="conj-paste-status" className="small" role="status">
        {text.trim() === '' || !parsed ? null : parsed.ok ? (
          <>
            <span className="conj-paste-ok">
              Found {parsed.forms.length} forms: {parsed.persons.length}{' '}
              {parsed.persons.length === 1 ? 'person' : 'persons'} ×{' '}
              {parsed.tenses.map((key) => group.tenses.find((t) => t.key === key)?.label).join(', ')}.
            </span>
            {replaced > 0 && (
              <span className="conj-paste-warn">
                {' '}
                {replaced} filled {replaced === 1 ? 'form' : 'forms'} will be replaced.
              </span>
            )}
          </>
        ) : (
          <span className="conj-paste-error">{parsed.error}</span>
        )}
      </p>
    </div>
  );
}
