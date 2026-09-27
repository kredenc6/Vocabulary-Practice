# Vocab Practice – Spanish ⇄ English

A React + TypeScript web app for practicing Spanish–English vocabulary with flashcards, multiple-choice quizzes, and typed answers. It schedules reviews with spaced repetition (SM-2). Words and progress are stored per user in Firebase Cloud Firestore, so they sync across devices. Sign-in uses Google.

## Features

- **Vocabulary management**: add, edit, and delete word pairs, search and filter them, import from CSV, and export to CSV.
- **CSV import**: two columns (Spanish, English), with or without a header row. Comma and semicolon delimiters are auto-detected. Duplicates and invalid rows are skipped, and you see a preview before anything is imported.
- **Practice directions**: Spanish → English, English → Spanish, or a random mix.
- **Practice modes** (use one or mix several):
  - **Flashcards**: flip the card and rate yourself ("I knew it" / "I didn't know it").
  - **Multiple choice**: 4 options, exactly one correct.
  - **Typed translation**: case and punctuation are ignored, and English "to"/"the" are optional. Missing accents, small typos, and a missing Spanish article count as **"close enough"**. An "I was right" button lets you accept synonyms.
- **Spaced repetition (SM-2)**: each word has its own ease factor, interval, and repetition count. Correct answers grow the interval; wrong answers reset it, and the word becomes due again right away. Missed words can be repeated at the end of a session.
- **Statistics**: total, due, new, learning, and mastered counts; last-session and 7-day accuracy; a day streak; daily reviews and session-accuracy charts; recent sessions; the most difficult words.
- Responsive layout with automatic light/dark theme, keyboard shortcuts, and offline support (Firestore local cache).

## Tech stack

React 19, TypeScript, and Vite 6 (`react-ts` template); the Firebase JS SDK (Auth and Firestore); PapaParse; Recharts.

## Getting started

### 1. Install dependencies

Requires Node.js 20 or newer.

```bash
npm install
```

### 2. Create a Firebase project

1. Open the [Firebase console](https://console.firebase.google.com/) and create a project.
2. **Authentication**: go to *Sign-in method*, enable **Google**.
3. **Firestore Database**: create a database in *production mode*.
4. **Project settings**: under *Your apps*, add a **Web app** and copy its config values.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in the values from step 2.4:

| Variable | Required |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | yes |
| `VITE_FIREBASE_PROJECT_ID` | yes |
| `VITE_FIREBASE_APP_ID` | yes |
| `VITE_FIREBASE_STORAGE_BUCKET` | optional |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | optional |

`.env` is git-ignored. If a required variable is missing, the app shows a setup screen instead of crashing.

### 4. Deploy the Firestore security rules

The rules in [`firestore.rules`](firestore.rules) let each signed-in user read and write only their own data under `users/{uid}/...`. They also validate the shape of word documents. Deploy them in either of two ways:

- **Firebase console**: go to *Firestore Database → Rules*, paste the contents of `firestore.rules`, and click *Publish*.
- **Firebase CLI**:

  ```bash
  npm install -g firebase-tools
  firebase login
  firebase deploy --only firestore:rules --project <your-project-id>
  ```

### 5. Run locally

```bash
npm run dev
```

Open http://localhost:5173. `localhost` is an authorized sign-in domain by default.

Other scripts:

```bash
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build locally
npm run lint      # ESLint
```

## Deployment (GitHub + Netlify)

1. **Push to GitHub:**

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

2. **Connect Netlify.** In Netlify, choose *Add new site → Import an existing project → GitHub*, then pick the repo. The build settings are read from [`netlify.toml`](netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Add environment variables.** Under *Site configuration → Environment variables*, add the same `VITE_FIREBASE_*` variables as in your `.env`, then trigger a redeploy. Vite embeds these values at build time.
4. **Authorize the domain.** In Firebase, go to *Authentication → Settings → Authorized domains* and add your Netlify domain (e.g. `your-site.netlify.app`, plus any custom domain).

Every push to `main` now deploys automatically.

## Data model

```
users/{uid}/words/{wordId}        VocabWord: spanish, english, easeFactor, interval,
                                  repetitions, nextReviewDate, lastReviewedAt, lapses,
                                  totalReviews, correctReviews, createdAt, updatedAt
users/{uid}/sessions/{sessionId}  finished practice sessions (for accuracy history)
users/{uid}/dailyStats/{YYYY-MM-DD}  per-day review counters (for the activity chart)
```

All timestamps are epoch milliseconds. Types live in [`src/types.ts`](src/types.ts).

**Word status:** *New* means never practiced. *Learning* means the interval is under 21 days. *Mastered* means the interval is 21 days or more.

## Project structure

```
src/
├── main.tsx               entry – shows a setup screen if Firebase env vars are missing
├── App.tsx                auth gate (login screen vs. app)
├── types.ts               shared data models
├── firebase/
│   ├── config.ts          typed config read from import.meta.env
│   ├── firebase.ts        app, auth, Google provider, Firestore (offline cache)
│   └── paths.ts           typed collection refs + Firestore data converters
├── services/              Firestore reads/writes (words, reviews, sessions, stats)
├── context/               AuthProvider and WordsProvider (real-time word sync)
├── hooks/                 hotkeys, hash-based tabs, stats subscription, chart theme
├── lib/
│   ├── srs.ts             SM-2 spaced repetition
│   ├── answerCheck.ts     typo/accent-tolerant answer checking
│   ├── practice.ts        session building (word selection, modes, MC options)
│   ├── csv.ts             CSV import/export (PapaParse)
│   ├── stats.ts           statistics aggregation
│   └── dates.ts           date helpers
├── pages/                 Practice, Vocabulary, Statistics
└── components/            UI (practice modes, vocabulary list, charts, …)
```

## Keyboard shortcuts (practice)

| Mode | Keys |
| --- | --- |
| Flashcards | `Space` flip · `1` didn't know · `2` knew it |
| Multiple choice | `1`–`4` choose · `Enter` next |
| Typed | `Enter` check · `Enter` next |
