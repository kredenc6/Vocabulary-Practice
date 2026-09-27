import type { FirebaseOptions } from 'firebase/app';

/** Environment variables that must be set for the app to work. */
const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const satisfies readonly (keyof ImportMetaEnv)[];

const env = import.meta.env;

/** Names of required variables that are missing or empty. */
export const missingFirebaseEnvVars: string[] = REQUIRED_ENV_VARS.filter((name) => !env[name]?.trim());

export const isFirebaseConfigured = missingFirebaseEnvVars.length === 0;

export const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};
