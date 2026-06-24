# running-coach

> Read `context/project.md` before writing any code — it describes what this app is, who it's for, and the conventions to follow.

## Stack

- **Backend**: [Hono](https://hono.dev/) running on Cloudflare Workers — handles all API routes under `/api/`
- **Frontend**: React 19 + [Vite](https://vitejs.dev/) — SPA built to `dist/`, served as static assets
- **Runtime**: Cloudflare Workers (edge) — no Node.js-only APIs
- **Database**: Cloudflare D1 (SQLite) via Drizzle ORM
- **Styling**: Tailwind CSS v4
- **Target**: Mobile-first PWA, installable on iOS and Android

## Architecture

The Worker (`src/worker.ts`) is the single entrypoint. It uses Hono to route requests:
- `/api/*` routes are handled by Hono — add new endpoints here
- Everything else is forwarded to `env.ASSETS.fetch()` which serves the Vite-built React SPA

```
request → Hono worker
            ├── /api/*   → your API handlers
            └── *        → static React SPA (dist/)
```

Never mix backend logic into the React frontend. Keep API calls in `src/api/` client modules, and keep all server-side logic in `src/worker.ts` or files it imports.

## Project structure

```
src/
  worker.ts         ← Hono app: API routes + SPA fallthrough (backend)
  main.tsx          ← React app entry point (frontend)
  App.tsx           ← root React component
  index.css         ← global styles (Tailwind)
  api/              ← client-side API helper modules (optional)
  components/       ← React components
index.html          ← Vite HTML entry
vite.config.ts      ← Vite config (React + Tailwind + PWA)
public/
  icons/            ← PWA icons (192×192, 512×512, apple-touch-icon)
context/
  project.md        ← project brief read by the agent before every run
specs/
  pending/          ← drop spec JSON files here to queue work
  deployed/         ← processed specs (do not edit)
migrations/         ← Drizzle D1 migration files
```

## Conventions

### Backend (Hono — `src/worker.ts`)
- Add routes with `app.get/post/put/delete("/api/...")`.
- Access D1 via `c.env.DB` (Drizzle binding). Never access `process.env` — use `c.env.*`.
- Return JSON with `c.json(...)`. Use `c.json({ error: "..." }, 400)` for errors.
- HTTP request logging is enabled via `hono/logger` middleware — do not remove it.

### Frontend (React — `src/`)
- Write plain React components. No server components, no `'use client'` directives.
- Fetch data from `/api/*` endpoints using `fetch()` or a thin wrapper in `src/api/`.
- Use Tailwind utility classes for styling. Do not write custom CSS unless unavoidable.
- All pages must be responsive. Design mobile-first (375 px base), then adapt for desktop.

### Database
- Access via Drizzle ORM. Schema lives in `db/schema.ts`; migrations in `migrations/`.
- Never hard-code secrets. Read them from `c.env` (Cloudflare env bindings) in the worker.

## What you may change

- Any file under `src/`, `db/`, `migrations/`, `public/` (except `public/icons/` unless the spec asks)
- `package.json` to add dependencies (run `npm install` after)
- `vite.config.ts` only if the spec explicitly requires a Vite plugin

## What you must NOT change

- `wrangler.json` — deployment config
- `AGENTS.md`, `CLAUDE.md` — agent/AI instructions
- `context/project.md` — unless the spec explicitly says to update it
- `specs/` — the agent manages this folder
