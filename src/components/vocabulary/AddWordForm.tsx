import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useWords } from '../../context/words';
import { pairKey } from '../../lib/csv';

export function AddWordForm() {
  const { words, addWord } = useWords();
  const [spanish, setSpanish] = useState('');
  const [english, setEnglish] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const spanishRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const pair = { spanish: spanish.trim(), english: english.trim() };
    if (!pair.spanish || !pair.english) return;

    const key = pairKey(pair);
    if (words.some((w) => pairKey(w) === key)) {
      setMessage({ type: 'error', text: `"${pair.spanish} – ${pair.english}" is already in your vocabulary.` });
      return;
    }

    setSpanish('');
    setEnglish('');
    setMessage(null);
    spanishRef.current?.focus();
    try {
      await addWord(pair);
      setMessage({ type: 'success', text: `Added "${pair.spanish} – ${pair.english}".` });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Could not save the word. Please try again.' });
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Add a word</h2>
        <p>Separate alternative translations with “/”, e.g. “car / automobile”.</p>
      </div>
      <form className="add-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Spanish</span>
          <input
            ref={spanishRef}
            className="input"
            value={spanish}
            onChange={(e) => setSpanish(e.target.value)}
            placeholder="la manzana"
            lang="es"
            maxLength={300}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">English</span>
          <input
            className="input"
            value={english}
            onChange={(e) => setEnglish(e.target.value)}
            placeholder="the apple"
            lang="en"
            maxLength={300}
            required
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={!spanish.trim() || !english.trim()}>
          Add word
        </button>
      </form>
      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginTop: '0.75rem' }} role="status">
          {message.text}
        </div>
      )}
    </div>
  );
}
