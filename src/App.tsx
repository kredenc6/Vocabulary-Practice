import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './context/auth';
import { WordsProvider } from './context/WordsProvider';
import { LoginScreen } from './components/LoginScreen';
import { AppShell } from './components/AppShell';
import { Spinner } from './components/Spinner';

function AuthGate() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="center-screen">
        <Spinner label="Loading…" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <WordsProvider key={user.uid} uid={user.uid}>
      <AppShell />
    </WordsProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
