Mindful Growth – Local-First Journaling & Emotions

A local-first Vue 3 app for mindful growth: journaling, fast emotion check-ins, exercises, and self-knowledge tools – all stored on your device.

✨ Features (v1 focus)
	•	Journal – Freeform entries with emotion tags and simple context tags.
	•	Emotions – Ultra-fast “right now I feel…” logs using a shared emotion grid.
	•	Profile (browser) – View and filter all your entries and emotion logs in one place.
	•	Local-first storage – Data saved locally (IndexedDB) and stays on your device.
	•	Shared emotion system – 2×2 grid (pleasantness × energy) reused across the app.
	•	Responsive UI – Works on desktop and mobile.

Later versions will add:
	•	Structured exercises (CBT, IFS, etc.).
	•	Questionnaires (Big Five, VIA, etc.).
	•	AI-powered psychological profile and insight chat.

⸻

🚀 Quick Start

# Install dependencies
npm install

# Run dev server
npm run dev

# Run unit tests
npm run test

# Build for production
npm run build


⸻

🧠 App Overview

Core views:
	•	Today – Daily hub (placeholder for now).
	•	Journal – Create and browse deeper reflections.
	•	Emotions – Very fast emotional check-ins.
	•	Exercises – Library of self-reflection tools (later).
	•	Profile – Global browser + filters for everything you’ve logged.

Shared data model (simplified):
	•	Emotion – id, name, pleasantness, energy (used everywhere).
	•	JournalEntry – text body, optional title, many emotions, optional tags.
	•	EmotionLog – timestamped “right now I feel…” snapshots with many emotions, optional note/tags.
	•	ExerciseSession – structured answers from an exercise (later).
	•	QuestionnaireResult – results of longer questionnaires (later).

All of these are stored locally.

⸻

🧱 Tech Stack

Core
	•	Vue 3 – Framework (Composition API).
	•	Vite – Build tool & dev server.
	•	TypeScript – Type safety.
	•	TailwindCSS – Styling.
	•	Vue Router – Navigation between Today / Journal / Emotions / Exercises / Profile.
	•	Pinia – State management (emotion database, journal store, emotion log store).

Local-first & Offline
	•	Dexie – IndexedDB wrapper library for persistent local storage.
	•	Vite PWA plugin – PWA support (installable app, offline shell).

Testing
	•	Vitest – Unit tests.
	•	Vue Test Utils – Component testing helpers.
	•	@testing-library/vue + @testing-library/jest-dom – User-centric component tests.
	•	Playwright – End-to-end tests for main flows (e.g. “log emotion → see in Profile”).

Tooling & CI/CD
	•	ESLint – Linting (Vue + TS).
	•	Prettier – Formatting.
	•	GitHub Actions – CI pipeline (lint, test, build).
	•	Husky – Git hooks.
	•	lint-staged – Run lint/format on changed files.

⸻

🛠️ Scripts

Typical scripts (names may vary depending on your package.json):

# Development
npm run dev          # Start dev server (default Vite port 5173)
npm run build        # Production build
npm run preview      # Preview production build locally

# Tests
npm run test         # Unit tests (watch mode)
npm run test:run     # Unit tests (single run)
npm run test:e2e     # Playwright E2E tests

# Quality
npm run lint         # Lint (ESLint)
npm run lint:fix     # Lint + auto-fix / format


⸻

📁 Project Structure (example)

src/
├── components/           # Reusable UI components
│   ├── EmotionSelector/  # Shared emotion picker (quadrants + emotion chips)
│   └── ...
├── views/                # Top-level views (for Vue Router)
│   ├── TodayView.vue
│   ├── JournalView.vue
│   ├── EmotionsView.vue
│   ├── ExercisesView.vue
│   └── ProfileView.vue
├── domain/              # Domain models/interfaces
│   └── journal.ts       # JournalEntry interface
├── repositories/        # Data persistence layer
│   ├── journalRepository.ts      # Repository interface
│   └── journalDexieRepository.ts # Dexie implementation
├── stores/               # Pinia stores
│   ├── emotion.store.ts      # Emotion database (2×2 grid)
│   ├── journal.store.ts      # Journal entries
│   └── emotionLog.store.ts   # Emotion logs
├── router/
│   └── index.ts         # Route definitions
├── assets/
└── main.ts              # App entry point


⸻

🔄 CI/CD (short)

GitHub Actions pipeline (example):
	•	Run lint (npm run lint)
	•	Run unit tests (npm run test:run)
	•	Run build (npm run build)
	•	Optionally run E2E tests on main / protected branches

You can later add automatic deployment (e.g. to Vercel/Netlify) after a successful build.

⸻

That’s the “trimmed but still useful” version: enough to explain what the app is, what it uses, and how to run it, without all the TDD process details.