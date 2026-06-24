# running-coach

> Read `context/project.md` before writing any code — it describes what this app is, who it's for, and the conventions to follow.

## Stack

- **Framework**: Next.js 15 (App Router) deployed on Cloudflare Pages via `@opennextjs/cloudflare`
- **Runtime**: Cloudflare Workers (edge) — no Node.js-only APIs
- **Database**: Cloudflare D1 (SQLite) via Drizzle ORM
- **UI**: shadcn/ui components on Base UI primitives, Tailwind CSS v4
- **Target**: Mobile-first PWA, installable on iOS and Android

## Project structure

```
app/                ← Next.js App Router pages and layouts
  layout.tsx        ← root layout with PWA meta tags and SW registration
  page.tsx          ← home page
  globals.css       ← global styles
  sw-register.tsx   ← client component that registers the service worker
public/
  manifest.json     ← PWA manifest
  sw.js             ← service worker
  icons/            ← PWA icons (add 192×192 and 512×512 PNG + apple-touch-icon)
context/
  project.md        ← project brief read by the agent before every run
specs/
  pending/          ← drop spec JSON files here to queue work
  deployed/         ← processed specs (do not edit)
migrations/         ← Drizzle D1 migration files
```

## Conventions

- All pages must be responsive. Design mobile-first (375 px base), then adapt for desktop.
- Use Tailwind utility classes directly. Do not write custom CSS unless unavoidable.
- Use shadcn/ui components first; use Base UI primitives for custom headless behaviour.
- Server Components by default. Add `'use client'` only when interactivity requires it.
- API routes go in `app/api/`. Server Actions are preferred for form mutations.
- Database access via Drizzle. Schema lives in `db/schema.ts`; migrations in `migrations/`.
- Never hard-code secrets. Read them from `process.env` (Cloudflare env bindings).

## What you may change

- Any file under `app/`, `components/`, `lib/`, `db/`, `migrations/`, `public/` (except `sw.js` and `manifest.json` unless the spec explicitly asks)
- `package.json` to add dependencies (run `npm install` after)

## What you must NOT change

- `wrangler.json`, `open-next.config.ts` — deployment config
- `AGENTS.md`, `CLAUDE.md` — agent/AI instructions
- `context/project.md` — unless the spec explicitly says to update it
- `specs/` — the agent manages this folder
