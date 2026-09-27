import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { isFirebaseConfigured, missingFirebaseEnvVars } from './firebase/config';
import { ConfigMissing } from './components/ConfigMissing';

const root = createRoot(document.getElementById('root')!);

if (!isFirebaseConfigured) {
  // Show setup instructions instead of crashing when .env is missing.
  root.render(<ConfigMissing missing={missingFirebaseEnvVars} />);
} else {
  // Firebase is only initialized (inside App's imports) once config is present.
  import('./App').then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
}
