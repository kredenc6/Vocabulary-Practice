import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as fbSignOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth, googleProvider } from '../firebase/firebase';
import { AuthContext } from './auth';
import type { AuthContextValue } from './auth';

/** Errors that just mean the user closed the popup. */
const IGNORED_POPUP_ERRORS = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (next) => {
        setUser(next);
        setInitializing(false);
      }),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      async signIn() {
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (error) {
          if (error instanceof FirebaseError) {
            if (IGNORED_POPUP_ERRORS.has(error.code)) return;
            if (error.code === 'auth/popup-blocked') {
              await signInWithRedirect(auth, googleProvider);
              return;
            }
          }
          throw error;
        }
      },
      async signOut() {
        await fbSignOut(auth);
      },
    }),
    [user, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
