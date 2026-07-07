import type { Db } from "../../db";
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
} from "./nolioApi";
import { withNolioToken } from "./nolioSession";

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
];

async function executeTool(
  name: string,
  input: any,
  db: Db,
  userId: string,
  nolioClientSecret: string
): Promise<unknown> {
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

const SYSTEM_PROMPT = `You are an expert running coach embedded in the athlete's training app. You have direct read/write access to their Nolio account, which aggregates data synced from their Coros watch and Whoop band (trainings, HRV, sleep, resting heart rate, weight, personal records).

Use the tools to ground every answer in real data — pull recent trainings, HRV, and health metrics before giving advice on training load, recovery, or race readiness. When the athlete asks you to log a workout or schedule a future session, use the write tools directly rather than just describing what they should do.

Be concise, direct, and specific with numbers (paces, distances, HR zones) pulled from their actual data. Today's date is ${new Date().toISOString().slice(0, 10)}.`;

const MAX_TOOL_ITERATIONS = 6;

export async function runCoachAgent(
  db: Db,
  userId: string,
  nolioClientSecret: string,
  ai: Ai,
  history: ClaudeMessage[]
): Promise<{ reply: string; messages: ClaudeMessage[] }> {
  const messages: ClaudeMessage[] = [...history];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await callClaude(ai, messages, {
      system: SYSTEM_PROMPT,
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
        try {
          const result = await executeTool(tu.name, tu.input, db, userId, nolioClientSecret);
          return { type: "tool_result" as const, tool_use_id: tu.id, content: JSON.stringify(result) };
        } catch (e: any) {
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

  return {
    reply: "I ran into trouble gathering everything I needed — try asking again, maybe with a narrower question.",
    messages,
  };
}
