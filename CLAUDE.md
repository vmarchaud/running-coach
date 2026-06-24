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

## CRITICAL — how to handle user requests

When a user asks you to build or change something in this repo through Claude Code (web, IDE, or CLI), you must **write a spec file** into `specs/pending/` and commit it. Do NOT directly edit application source files.

The nightly-agents platform reads specs and writes the code. If you bypass this by editing `src/` yourself, the change will not be tracked, may not be deployed correctly, and breaks the intended workflow.

**The only correct response to "add X" or "fix Y" is:**
1. Write `specs/pending/<id>.json` with the spec
2. Commit and push to `master`
3. Tell the user the spec was queued

## What you may change directly (without a spec)

- `specs/pending/` — to add new spec files
- `context/project.md` — to update the project brief if the user asks

## What you must NEVER change directly

- Any source code: `src/`, `app/`, `db/`, `migrations/`, `public/`
- `package.json`, `vite.config.ts`, `wrangler.json` — config files
- `AGENTS.md`, `CLAUDE.md` — these instruction files
