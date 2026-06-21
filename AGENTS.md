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
- Push to branches other than `main`

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
- **Framework**: [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/) via `@opennextjs/cloudflare`
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) with the `better-sqlite3` dialect (D1 adapter) — type-safe, zero-dependency, works on the edge
- **UI components**: [shadcn/ui](https://ui.shadcn.com/) built on top of [Base UI](https://base-ui.com/) — unstyled, accessible primitives styled with Tailwind CSS
- **Styling**: Tailwind CSS v4

When adding UI components, prefer shadcn/ui first. For lower-level control (custom animations, headless behaviour), use Base UI primitives directly.

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
