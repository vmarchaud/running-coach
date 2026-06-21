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
- If the feature touches a database column, describe the expected shape — schema migrations are out of scope for the agent
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

This project has a dedicated PostgreSQL database. The connection string is available to the agent — if a spec needs DB access, reference it in your description and the agent will use it.
