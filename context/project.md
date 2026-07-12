# Running Coach

An AI-powered training companion for a semi-marathon (21.1 km) runner, spanning
beginner to expert levels. It connects to the user's [Nolio](https://www.nolio.io)
account — which aggregates data synced from a Coros watch and a Whoop band — and
gives them a conversational coach grounded in their real training data.

## Who it's for

A single athlete (the app owner) training for a semi-marathon in Paris. The app
supports any fitness level from "never run 10k" to "targeting sub-1h30," but in
practice it's built around this one user's actual Nolio account and Coros/Whoop
setup.

## Core idea

Nolio is the single source of truth for all training data — planned sessions,
completed workouts, HRV, health metrics, personal records, and race goals
(modeled in Nolio as a "competition"). The app does **not** keep its own copy of
a training plan or workout log; it reads and writes directly through Nolio's
API. This was a deliberate correction after an early version generated its own
training plan locally, which drifted out of sync with what Coros/Whoop actually
synced into Nolio.

The only data this app owns locally (in D1) is:
- **Onboarding profile** — name, fitness level, days/week, race date, target
  time. Used to personalize the coach; the race date/goal is also pushed to
  Nolio as a real competition right after onboarding.
- **Nolio OAuth tokens** — access/refresh token per user, auto-refreshed.
- **Coach conversation history** — persisted so it survives a refresh and
  follows the user across devices (not per-browser localStorage).
- **Coach memory** — durable notes the coach saves about the athlete
  (preferences, injuries, feedback on sessions), separate from the chat
  history so clearing a conversation doesn't erase what's been learned.

## Identity & auth

Nolio OAuth2 is the *only* sign-in mechanism — there's no separate app account
system. The app's internal user ID is derived from the authenticated Nolio
account (`nolio_<nolio_user_id>`). Every API request is checked against a live
Nolio token record, not just a trusted header.

## The AI coach

A tool-using chat agent (`src/lib/coachAgent.ts`) with:
- **Read tools**: recent/planned trainings, training detail (HR/pace/power/
  cadence streams, laps), HRV, health metrics, personal records, upcoming race
  objectives, and a "known sports" discovery tool (Nolio has no sport
  directory endpoint, so sport IDs are discovered from the athlete's own
  history instead of guessed).
- **Write tools**: log a completed training, schedule a planned one — for any
  sport, though most sessions sync in automatically from Coros/Whoop and don't
  need manual logging.
- **Memory tools**: `save_memory` / `load_memory`, used proactively to
  remember things worth carrying across conversations.
- The system prompt is dynamically grounded every turn with the athlete's
  current goal, fitness profile, most recent training, and recent memories —
  so the coach doesn't need a tool round-trip just to be relevant.

The model runs on NVIDIA's hosted inference API (`nvidia/nemotron-3-ultra-550b-a55b`,
OpenAI-compatible), chosen after Cloudflare Workers AI's free tier proved too
small for this workload.

## Frontend

Four tabs: **This Week** (Nolio sessions for the current/a previous week, race
countdown, goals from Nolio), **Plan** (upcoming Nolio-scheduled sessions,
grouped by week), **History** (completed Nolio trainings, paginated), and
**Coach** (the chat).

## Conventions specific to this app

- Never reintroduce local storage for training data (plans, workouts, logs) —
  read/write Nolio directly. If Nolio lacks a field for something (e.g. it has
  no "training days/week" concept), don't invent a fake field; fold it into an
  existing text field as context, or say so plainly.
- Nolio's documented API surface lives at
  https://github.com/NolioApp/NolioAPI-Documentation/wiki — never invent an
  endpoint, param, or field. If something's needed but undocumented, that's a
  reason to ask rather than guess.
- Nolio API calls transparently refresh the access token on a 401
  (`src/lib/nolioSession.ts`) — reuse that helper for any new Nolio call
  rather than handling auth ad hoc.
