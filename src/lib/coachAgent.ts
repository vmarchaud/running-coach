import { eq } from "drizzle-orm";
import type { Db } from "../../db";
import { users } from "../../db/schema";
import { callClaude, ClaudeContentBlock, ClaudeMessage, ClaudeTool } from "./claude";
import {
  getTrainings,
  getTrainingInfo,
  getPlannedTrainings,
  getHrvMeasures,
  getUserMeta,
  getRecords,
  createTraining,
  createPlannedTraining,
  getKnownSports,
  getUpcomingObjectives,
} from "./nolioApi";
import { withNolioToken } from "./nolioSession";
import { diffDays } from "./dateUtils";
import { saveMemory, loadMemories } from "./memory";

const TOOLS: ClaudeTool[] = [
  {
    name: "get_recent_trainings",
    description: "List the athlete's completed trainings (runs, rides, etc), most recent first. Includes data synced from connected devices like Coros and Whoop.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date YYYY-MM-DD" },
        to: { type: "string", description: "End date YYYY-MM-DD" },
        limit: { type: "integer", description: "Max results, default 30" },
      },
    },
  },
  {
    name: "get_training_detail",
    description: "Get full detail for one training by its nolio_id: streams (HR/pace/altitude over time), laps, HR zones, power data.",
    input_schema: {
      type: "object",
      properties: { id: { type: "integer", description: "The training's nolio_id" } },
      required: ["id"],
    },
  },
  {
    name: "get_planned_trainings",
    description: "List trainings already scheduled in the athlete's Nolio calendar.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date YYYY-MM-DD" },
        to: { type: "string", description: "End date YYYY-MM-DD" },
        limit: { type: "integer" },
      },
    },
  },
  {
    name: "get_hrv",
    description: "Get heart rate variability measurements (recovery indicator), typically synced from a chest strap or wearable like Whoop.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date YYYY-MM-DD" },
        to: { type: "string", description: "End date YYYY-MM-DD" },
        limit: { type: "integer" },
      },
    },
  },
  {
    name: "get_health_metrics",
    description: "Get all tracked health metrics (weight, sleep duration, resting heart rate, etc), tagged with their source device (e.g. Coros, Whoop, Garmin).",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date YYYY-MM-DD" },
        to: { type: "string", description: "End date YYYY-MM-DD" },
        limit: { type: "integer" },
      },
    },
  },
  {
    name: "get_records",
    description: "Get the athlete's personal records for a category: ppr=peak power, phrr=peak HR, par=peak pace, ptr=peak time, pvar=peak VAM, pcadr=peak cadence.",
    input_schema: {
      type: "object",
      properties: {
        cat: { type: "string", enum: ["ppr", "phrr", "par", "ptr", "pvar", "pcadr"] },
        record_type: { type: "string", enum: ["time", "distance"] },
        from: { type: "string" },
        to: { type: "string" },
        sports: { type: "string", description: "Comma-separated sport IDs" },
      },
      required: ["cat", "record_type"],
    },
  },
  {
    name: "list_known_sports",
    description: "List sport_id values that have actually appeared in this athlete's Nolio history (completed or planned), with their sport name — e.g. Strength Training if they've ever logged one. Nolio has no directory endpoint for sports, so this is discovered from their own data. Call this BEFORE log_completed_training or schedule_planned_training whenever the sport isn't Running/Trail/Cycling, instead of guessing a sport_id.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "log_completed_training",
    description: "Manually log a training the athlete completed — any sport, not just running. Most trainings sync in automatically from Coros/Whoop via Nolio and don't need this — only use it for a session that won't sync (e.g. strength work, swimming, a sport without a connected device) or one the athlete explicitly asks you to add. Only Running=2, Trail=52, and Cycling=9 are confirmed sport_ids off the top of your knowledge — for anything else (like Strength Training), call list_known_sports first; if it's not there either, ask the athlete.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        sport_id: { type: "integer", description: "2 = Running, 52 = Trail, 9 = Cycling. Call list_known_sports for other sports." },
        date_start: { type: "string", description: "YYYY-MM-DD" },
        duration: { type: "integer", description: "Seconds" },
        distance: { type: "number", description: "Kilometers" },
        elevation_gain: { type: "integer", description: "Meters" },
        description: { type: "string" },
        rpe: { type: "integer", description: "Rate of perceived exertion, 1-10" },
        feeling: { type: "integer", description: "1-5 scale" },
      },
      required: ["name", "sport_id", "date_start"],
    },
  },
  {
    name: "schedule_planned_training",
    description: "Schedule a future training on the athlete's Nolio calendar — any sport, not just running (e.g. strength work, cross-training, a rest-day mobility session). Only Running=2, Trail=52, and Cycling=9 are confirmed sport_ids off the top of your knowledge — for anything else (like Strength Training), call list_known_sports first; if it's not there either, ask the athlete.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        sport_id: { type: "integer", description: "2 = Running, 52 = Trail, 9 = Cycling. Call list_known_sports for other sports." },
        date_start: { type: "string", description: "YYYY-MM-DD" },
        duration: { type: "integer", description: "Seconds" },
        distance: { type: "number", description: "Kilometers" },
        elevation_gain: { type: "integer", description: "Meters" },
        description: { type: "string" },
        rpe: { type: "integer" },
      },
      required: ["name", "sport_id", "date_start"],
    },
  },
  {
    name: "save_memory",
    description: "Save a durable note about the athlete for future conversations — a preference, an injury or recovery detail, feedback on how a session felt, a motivational trigger, anything worth remembering long-term. This persists even if the athlete clears the chat. Use it proactively whenever they share something worth remembering, not just when asked.",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string", description: "One clear, self-contained fact or note, e.g. \"Prefers early morning runs\" or \"Recovering from mild IT band pain as of 2026-07-10, avoid downhill running\"." },
      },
      required: ["content"],
    },
  },
  {
    name: "load_memory",
    description: "Recall everything saved about this athlete from past conversations (preferences, injuries, feedback, etc). A recent subset is already included in your system context — call this if you need the fuller history, e.g. the athlete asks 'what do you remember about me' or references something not in the recent context.",
    input_schema: { type: "object", properties: {} },
  },
];

async function executeTool(
  name: string,
  input: any,
  db: Db,
  userId: string,
  nolioClientSecret: string
): Promise<unknown> {
  if (name === "save_memory") return saveMemory(db, userId, input.content);
  if (name === "load_memory") return loadMemories(db, userId, 50);

  return withNolioToken(db, userId, nolioClientSecret, async (token) => {
    switch (name) {
      case "get_recent_trainings":
        return getTrainings(token, input);
      case "get_training_detail":
        return getTrainingInfo(token, input.id);
      case "get_planned_trainings":
        return getPlannedTrainings(token, input);
      case "get_hrv":
        return getHrvMeasures(token, input);
      case "get_health_metrics":
        return getUserMeta(token, input);
      case "get_records":
        return getRecords(token, input);
      case "list_known_sports":
        return getKnownSports(token);
      case "log_completed_training":
        return createTraining(token, input);
      case "schedule_planned_training":
        return createPlannedTraining(token, input);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });
}

const BASE_SYSTEM_PROMPT = `You are an expert running coach embedded in the athlete's training app. You have direct read/write access to their Nolio account, which aggregates data synced from their Coros watch and Whoop band (trainings, HRV, sleep, resting heart rate, weight, personal records).

Use the tools to ground every answer in real data — pull recent trainings, HRV, and health metrics before giving advice on training load, recovery, or race readiness.

When the athlete asks you to plan or schedule training (a single session or a multi-day/multi-week plan), do NOT call schedule_planned_training or log_completed_training yet. First write out the full proposed plan in plain text (dates, sessions, distances, paces, RPE) and ask the athlete to confirm or adjust it. Only call the write tools once they've explicitly confirmed (e.g. "yes", "looks good", "go ahead") or asked you to change something and then re-confirmed. The one exception: if the athlete explicitly says to just create it without review (e.g. "just add it", "no need to confirm"), you can write directly.

You have a persistent memory (save_memory / load_memory) separate from this chat history. Proactively save anything worth remembering across conversations: stated preferences, injuries or pain they mention, how a session actually felt versus planned, what motivates or discourages them, recurring scheduling constraints. Don't wait to be asked — a throwaway comment like "my knee's been sore" or "I hate early starts" is exactly what belongs in memory. Use what's already saved (shown below) to tailor advice instead of asking the athlete to repeat themselves.

Be concise, direct, and specific with numbers (paces, distances, HR zones) pulled from their actual data. Today's date is ${new Date().toISOString().slice(0, 10)}.`;

// Bakes the athlete's goal and last session directly into the system prompt so
// every reply is grounded from the first message, without spending a tool-call
// round trip just to find out what's relevant. Nolio's own objectives (a planned
// training with is_competition: true) take priority over the onboarding race
// date, since they're the live, user-maintained source; the tools remain
// available for anything needing more depth.
async function buildSystemPrompt(db: Db, userId: string, nolioClientSecret: string): Promise<string> {
  const profile = await db.select().from(users).where(eq(users.id, userId)).get();

  let objectiveLine = "No race goal set yet.";
  let lastSessionLine = "No completed trainings found yet.";

  try {
    await withNolioToken(db, userId, nolioClientSecret, async (token) => {
      const [objectives, recent] = await Promise.all([
        getUpcomingObjectives(token),
        getTrainings(token, { limit: 1 }),
      ]);

      if (objectives.length > 0) {
        const main = objectives[0];
        const daysAway = diffDays(new Date(), new Date(main.dateStart + "T00:00:00"));
        objectiveLine = `Main goal: "${main.name}" (${main.sport ?? "race"}) on ${main.dateStart}, ${daysAway} days away.`;
        if (objectives.length > 1) {
          objectiveLine += ` Secondary goals: ${objectives
            .slice(1)
            .map((o) => `"${o.name}" on ${o.dateStart}`)
            .join(", ")}.`;
        }
      } else if (profile) {
        const daysAway = diffDays(new Date(), new Date(profile.raceDate));
        objectiveLine = `Race goal (from onboarding, no matching Nolio objective found): ${profile.raceDate}, ${daysAway} days away.`;
      }

      const last = (recent as any[])[0];
      if (last) {
        lastSessionLine = `${last.sport ?? "Training"} on ${last.date_start}: ${last.distance ?? "?"} km${
          last.duration ? `, ${Math.round(last.duration / 60)} min` : ""
        }${last.rpe ? `, RPE ${last.rpe}/10` : ""}.`;
      }
    });
  } catch {
    // Not connected to Nolio, or a transient failure — fall back to onboarding
    // profile only rather than blocking the whole reply on this context.
    if (profile) {
      const daysAway = diffDays(new Date(), new Date(profile.raceDate));
      objectiveLine = `Race goal (from onboarding): ${profile.raceDate}, ${daysAway} days away.`;
    }
  }

  const fitnessLine = profile
    ? `Fitness level: ${profile.fitnessLevel}.${profile.targetTimeMinutes ? ` Target time: ${profile.targetTimeMinutes} minutes.` : ""}`
    : "";

  const memories = await loadMemories(db, userId, 10);
  const memoryLines = memories.length > 0 ? memories.map((m) => `- ${m}`).join("\n") : "Nothing saved yet.";

  return `${BASE_SYSTEM_PROMPT}

Athlete context (already fetched — don't re-ask for this):
${fitnessLine}
${objectiveLine}
Last session: ${lastSessionLine}

What you've learned about this athlete so far (most recent 10 — call load_memory for the full history):
${memoryLines}`;
}

const MAX_TOOL_ITERATIONS = 10;

// Human-friendly label for a tool call, shown live in the chat UI while the
// agent is working in the background (e.g. "Checking recent trainings...").
const TOOL_LABELS: Record<string, string> = {
  get_recent_trainings: "Checking recent trainings",
  get_training_detail: "Pulling up training detail",
  get_planned_trainings: "Checking your training calendar",
  get_hrv: "Checking HRV",
  get_health_metrics: "Checking health metrics",
  get_records: "Checking personal records",
  list_known_sports: "Looking up sport types",
  log_completed_training: "Logging a completed training",
  schedule_planned_training: "Scheduling a training",
  save_memory: "Saving a note",
  load_memory: "Recalling past notes",
};

export type AgentEvent =
  | { type: "tool_start"; id: string; name: string; label: string; input: Record<string, unknown> }
  | { type: "tool_end"; id: string; name: string; ok: boolean };

export async function runCoachAgent(
  db: Db,
  userId: string,
  nolioClientSecret: string,
  nvidiaApiKey: string,
  history: ClaudeMessage[],
  onEvent?: (event: AgentEvent) => void | Promise<void>
): Promise<{ reply: string; messages: ClaudeMessage[] }> {
  const messages: ClaudeMessage[] = [...history];
  const systemPrompt = await buildSystemPrompt(db, userId, nolioClientSecret);

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await callClaude(nvidiaApiKey, messages, {
      system: systemPrompt,
      tools: TOOLS,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((b): b is Extract<ClaudeContentBlock, { type: "text" }> => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return { reply: text, messages };
    }

    const toolUses = response.content.filter(
      (b): b is Extract<ClaudeContentBlock, { type: "tool_use" }> => b.type === "tool_use"
    );

    const toolResults: ClaudeContentBlock[] = await Promise.all(
      toolUses.map(async (tu) => {
        await onEvent?.({
          type: "tool_start",
          id: tu.id,
          name: tu.name,
          label: TOOL_LABELS[tu.name] ?? tu.name,
          input: tu.input,
        });
        try {
          const result = await executeTool(tu.name, tu.input, db, userId, nolioClientSecret);
          await onEvent?.({ type: "tool_end", id: tu.id, name: tu.name, ok: true });
          return { type: "tool_result" as const, tool_use_id: tu.id, content: JSON.stringify(result) };
        } catch (e: any) {
          await onEvent?.({ type: "tool_end", id: tu.id, name: tu.name, ok: false });
          return {
            type: "tool_result" as const,
            tool_use_id: tu.id,
            content: `Error: ${e.message}`,
            is_error: true,
          };
        }
      })
    );

    messages.push({ role: "user", content: toolResults });
  }

  // Hit the iteration cap without a final text reply. Push it as an assistant
  // message too — not just returning it as `reply` — otherwise the frontend
  // (which renders from `messages`, not `reply`) has nothing with a text block
  // to show, and the conversation appears to have gotten no response at all.
  const fallbackReply = "I ran into trouble gathering everything I needed — try asking again, maybe with a narrower question.";
  messages.push({ role: "assistant", content: fallbackReply });
  return { reply: fallbackReply, messages };
}
