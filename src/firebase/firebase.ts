import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured, missingFirebaseEnvVars } from './config';

if (!isFirebaseConfigured) {
  throw new Error(`Missing Firebase environment variables: ${missingFirebaseEnvVars.join(', ')}`);
}

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Firestore with an IndexedDB cache: data loads instantly on repeat visits,
 * the app keeps working offline and writes sync once the connection returns.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
