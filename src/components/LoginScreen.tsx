import { useState } from 'react';
import { useAuth } from '../context/auth';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function LoginScreen() {
  const { signIn } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setPending(true);
    setError(null);
    try {
      await signIn();
    } catch (err) {
      console.error(err);
      setError('Sign-in failed. Make sure this domain is authorized in Firebase Authentication settings.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="login-page">
      <main className="card login-card">
        <div className="brand-mark">ES</div>
        <div>
          <h1>Vocabulary Practice</h1>
          <p className="muted" style={{ marginTop: '0.4rem' }}>
            Learn Spanish–English vocabulary with flashcards, quizzes and spaced repetition. Your words sync across
            all your devices.
          </p>
        </div>
        <div className="login-demo" aria-hidden="true">
          <span>la casa → the house</span>
          <span>to run → correr</span>
        </div>
        <button type="button" className="btn google-btn btn-block" onClick={handleSignIn} disabled={pending}>
          <GoogleIcon />
          {pending ? 'Signing in…' : 'Sign in with Google'}
        </button>
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
