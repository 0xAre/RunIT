# RunIT

AI operational intelligence for event execution — from brief to blueprint, simulation, live ops, and post-event reporting.

## Stack

- **Next.js 16** (App Router)
- **Firebase** — Auth, Firestore, Storage, Hosting (Cloud Functions backend)
- **Gemini API** — `@google/generative-ai` (blueprint, agents, task resolution, reports)
- **You.com** — optional web research layer (`YOU_API_KEY`)

## Getting started

```bash
npm install
cp .env.example .env.local   # if you maintain one locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required environment variables

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Gemini API for all AI routes |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client config |
| `YOU_API_KEY` | Optional — web sourcing / research fallback |

## Project structure

```
app/                 # Next.js routes & API handlers
  api/ai/            # Gemini-powered AI endpoints
  api/search/        # Maps & places
  api/dag/           # Dependency graph propagation
  workspace/         # Authenticated event workspace
  auth/              # Sign in / sign up
components/          # Shared React components
hooks/               # React hooks (auth, etc.)
lib/                 # Server/client utilities (gemini, you, dag-engine, firebase)
store/               # Zustand stores (events, i18n)
public/              # Static assets
docs/                # Product docs, pitch script, changelog
scripts/             # Local tooling (pitch simulation, voiceover, scratch tests)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |

## Deploy

Firebase Hosting (asia-southeast2):

```bash
firebase deploy --only hosting,firestore:rules
```

## Documentation

- [Product blueprint](docs/runit_ai_event_execution_system_blueprint.md)
- [V2 changelog](docs/RUNIT_V2_CHANGELOG.md)
- [Pitch video script](docs/PITCHING_SCRIPT.md)
