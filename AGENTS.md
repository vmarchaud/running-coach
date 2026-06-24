# Nightly Agents

This repo is connected to [nightly-agents](https://github.com/vmarchaud/nightly-agents), an autonomous AI platform that ships features and fixes overnight.

## How it works

1. You drop a JSON spec file into `specs/pending/`
2. At **3am UTC** the agent reads the spec, fetches `context/project.md` from this repo, writes the code, and commits it directly to `main`
3. Specs with `"deploy_mode": "immediate"` are picked up within minutes of being pushed (via webhook)
4. A human-readable changelog is written after each run
5. If a spec fails, an issue is opened on the nightly-agents repo and the spec stays in `pending/` for the next run

## Writing a spec

Create a `.json` file in `specs/pending/`. The filename is arbitrary.

```json
{
  "id": "unique-spec-id",
  "title": "Add dark mode toggle",
  "description": "Add a dark/light mode toggle button to the site header. It should persist the user's preference in localStorage and apply the 'dark' class to the html element. Style it consistently with the existing header buttons.",
  "type": "feature",
  "deploy_mode": "scheduled"
}
```

### Fields

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique identifier — used to deduplicate and reference this spec |
| `title` | Yes | Becomes the git commit message — keep it concise |
| `description` | Yes | What to build. Be specific: mention exact text, placement, behaviour |
| `type` | Yes | `"feature"` or `"bugfix"` |
| `deploy_mode` | Yes | `"scheduled"` (next 3am run) or `"immediate"` (deploy on push via webhook) |

### Tips for good specs

- Describe the **outcome**, not the implementation
- Mention exact copy/text where it matters
- Reference existing patterns ("consistent with the existing card component")
- One spec = one logical change. Atomic specs are easier to deploy and revert

## Folder structure

```
specs/
  pending/    ← drop new spec files here
  deployed/   ← the agent moves specs here after processing (do not edit manually)
context/
  project.md  ← the agent reads this before writing any code (do not delete)
```

## What the agent can and cannot do

**Can:**
- Create, update, and delete files in the folders listed in `context/project.md`
- Read any file in the repo for context
- Write idiomatic code that follows existing conventions

**Cannot:**
- Run migrations or alter database schemas
- Create environment variables or secrets
- Interact with third-party services directly
- Push to branches other than `master`

> **Git rule**: Always commit and push directly to `master`. Never create feature branches or pull requests.

## Failure handling

If a run fails:
- The spec stays in `specs/pending/` and will be retried on the next scheduled run
- A GitHub issue is opened on the nightly-agents repo with the full error and spec JSON
- Fix the spec or the underlying issue, then push the corrected spec file to re-trigger

## Database

This project uses **Cloudflare D1** (SQLite-compatible). Migrations live in `migrations/` and are applied with `wrangler d1 migrations apply`. If a spec needs a new table or column, describe the expected schema in your spec description — the agent will generate a migration file. Schema changes that affect existing data must be described carefully.

## Tech stack

The agent will follow the conventions set up in this repo. New projects are scaffolded with:

- **Runtime**: Cloudflare Workers (edge, no Node.js APIs)
- **Backend**: [Hono](https://hono.dev/) — lightweight router for API routes (`/api/*`) running in the Worker
- **Frontend**: React 19 + [Vite](https://vitejs.dev/) — SPA compiled to static assets, served by the Worker
- **Database**: Cloudflare D1 (SQLite) accessed via [Drizzle ORM](https://orm.drizzle.team/) — type-safe, zero-dependency, works on the edge
- **Styling**: Tailwind CSS v4

The backend (Hono worker) and frontend (React SPA) are separate concerns in the same repo. API routes live in `src/worker.ts`; UI components live under `src/`. They communicate over `fetch("/api/...")` calls — never import server code into React components.

## PWA requirements

Every feature must be built as a **Progressive Web App** installable on both iOS and Android.

**Design principles:**
- **Mobile-first**: design for 375 px wide screens first. Adapt to desktop with responsive breakpoints (`sm:`, `md:`, `lg:`). Never break the mobile layout when adding desktop styles.
- **Touch-friendly**: tap targets minimum 44×44 px, generous padding, no hover-only interactions.
- **Safe areas**: respect `env(safe-area-inset-*)` for notched/rounded devices.

**PWA checklist for every feature:**
- Pages must load and be usable on a slow mobile connection (lean JS bundles, no blocking requests)
- Images must include `alt` text and use appropriate `width`/`height` attributes
- Interactive states (loading, empty, error) must be handled — no spinners that run forever
- Forms must work with the virtual keyboard open (avoid fixed-position inputs that get covered)

**Files to keep intact:**
- `vite.config.ts` manifest section — update `name`, `short_name`, `theme_color` as the brand evolves, but never remove required fields
- The service worker is managed automatically by `vite-plugin-pwa` — do not add a manual `sw.js`

**Icons (action required after setup):**
The app needs icons for the homescreen. Add these files manually:
- `public/icons/icon-192.png` — 192×192 px
- `public/icons/icon-512.png` — 512×512 px
- `public/icons/apple-touch-icon.png` — 180×180 px

## Claude Code compatibility

This repo includes a `CLAUDE.md` file. When running Claude Code in this repo (via the web, IDE extension, or CLI), that file is automatically loaded as context — it tells Claude about the project structure, conventions, and what it is and isn't allowed to change.

Keep `CLAUDE.md` up to date as the project evolves. It is the primary source of truth for any AI assistant working in this repo.

## PRD-first workflow

Before writing any spec, the recommended workflow is to **write a Product Requirements Document (PRD)** with the user. This ensures the agent has enough context to make the right decisions.

A good PRD covers:
- What problem is being solved and for whom
- What the feature looks, feels, and behaves like (from a user's perspective — no tech jargon)
- What success looks like (how would you know it's done?)
- What is explicitly out of scope

Once the PRD is agreed, break it into atomic specs and drop them into `specs/pending/` in order of dependency.
