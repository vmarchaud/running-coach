# Agent instructions — running-coach

Read `context/project.md` first — it describes what this app is, who it's for, and conventions specific to it.

## Stack

- **Backend**: [Hono](https://hono.dev/) on Cloudflare Workers, all routes under `/api/*`
- **Frontend**: React 19 + Vite, SPA built to `dist/`
- **Database**: Cloudflare D1 (SQLite) via Drizzle ORM
- **Styling**: Tailwind CSS v4
- **AI**: NVIDIA-hosted inference API (OpenAI-compatible chat completions) powers the in-app coach

## How to work in this repo

Edit application code directly — there's no spec-queue or separate build pipeline. Implement the change yourself:

1. Make the change in `src/`, `db/`, `migrations/`, etc.
2. Verify: `npx tsc --noEmit`, `npm run build`, `npm run test:e2e`
3. Commit with a clear message

Treat `wrangler.json` and Cloudflare secrets/bindings as tied to real provisioned infrastructure (a live D1 database, Worker secrets) — confirm with the user before changing them.

## Project structure

```
src/worker.ts        Hono entrypoint: API routes + SPA fallthrough
src/routes/          Hono route handlers
src/lib/             Nolio API client, coach agent, model client, shared utils
src/api/             client-side fetch wrappers
src/components/      React components
db/schema.ts         Drizzle schema
migrations/          D1 migrations
context/project.md   project brief — read before making changes
```

## Database

Cloudflare D1. Schema in `db/schema.ts`, migrations in `migrations/`, applied via `wrangler d1 migrations apply`. The GitHub Actions deploy workflow applies pending migrations automatically on push to `main`, before deploying.

## PWA requirements

Built as a Progressive Web App, installable on iOS and Android.

- **Mobile-first**: design for 375 px wide screens first, then adapt with `sm:`/`md:`/`lg:` breakpoints.
- **Touch-friendly**: tap targets at least 44×44 px, no hover-only interactions.
- **Safe areas**: respect `env(safe-area-inset-*)` for notched devices.
- Loading/empty/error states must be handled for every async view.
- The service worker is managed by `vite-plugin-pwa` — don't hand-write one.

## Git workflow

Develop on a feature branch, open a pull request, keep CI green (`.github/workflows/ci.yml` runs typecheck, build, and an e2e health check). The deploy workflow (`.github/workflows/deploy.yml`) runs migrations then deploys on push to `main`.
