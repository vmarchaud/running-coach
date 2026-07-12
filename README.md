# Running Coach

An AI-powered training companion for semi-marathon training. Connects to
[Nolio](https://www.nolio.io) — which aggregates data synced from a Coros
watch and a Whoop band — and gives you a conversational coach grounded in
your real training data: recent runs, HRV, recovery metrics, personal
records, and upcoming race goals.

See [`context/project.md`](context/project.md) for the full project brief,
and [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md) for conventions if
you're working on this with an AI coding agent.

## Stack

- **Backend**: [Hono](https://hono.dev/) on Cloudflare Workers (`/api/*`)
- **Frontend**: React 19 + Vite, PWA installable on iOS/Android
- **Database**: Cloudflare D1 (SQLite) via [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: Tailwind CSS v4
- **AI**: [NVIDIA's hosted inference API](https://build.nvidia.com/) (OpenAI-compatible), tool-calling agent grounded in live Nolio data

## How it works

Nolio is the source of truth for all training data — this app has no local
copy of a training plan or workout log. Sign-in is exclusively via Nolio
OAuth2; onboarding collects a fitness profile (level, days/week, race date,
target time) that personalizes the coach and gets pushed to Nolio as a real
race goal (competition). The coach is a tool-using agent that reads and
writes Nolio directly, with a small amount of its own state: conversation
history and a persistent memory of things worth remembering about you.

## Local development

```bash
npm install
npm run dev          # Vite dev server (frontend only, mocked/no API)
npm run dev:worker   # wrangler dev — runs the full Worker + D1 locally
```

## Build & verify

```bash
npx tsc --noEmit   # typecheck
npm run build      # production build (SPA + Worker)
npm run test:e2e   # boots the worker locally, checks GET /api/health
```

## Environment / secrets

Set as Cloudflare Worker secrets (`wrangler secret put <NAME>`):

| Secret | Purpose |
|---|---|
| `NOLIO_CLIENT_SECRET` | Nolio OAuth2 client secret |
| `NOLIO_REDIRECT_URI` | OAuth callback URL (`https://<your-domain>/api/nolio/callback`) |
| `NVIDIA_API_KEY` | NVIDIA inference API key, powers the coach |

The D1 database binding and Nolio OAuth `client_id` are configured in
`wrangler.json`.

## Database

Schema lives in `db/schema.ts`; migrations in `migrations/`. Apply with:

```bash
npx wrangler d1 migrations apply nightly-agents-running-coach --remote
```

The deploy workflow (`.github/workflows/deploy.yml`) does this automatically
on every push to `main`, before deploying.

## CI/CD

- `.github/workflows/ci.yml` — typecheck, build, and an e2e health check on every PR and push to `main`
- `.github/workflows/deploy.yml` — applies D1 migrations, then deploys to Cloudflare Workers on push to `main`
