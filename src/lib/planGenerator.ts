import { addDays, isoDate, nextMonday } from "./dateUtils";

export type FitnessLevel = "beginner" | "intermediate" | "advanced" | "expert";
export type SessionType = "easy_run" | "tempo" | "interval" | "long_run" | "rest";

export interface UserInput {
  id: string;
  fitnessLevel: FitnessLevel;
  daysPerWeek: 3 | 4 | 5;
  raceDate: string;
  targetTimeMinutes?: number | null;
}

export interface WorkoutInsert {
  id: string;
  planId: string;
  userId: string;
  weekNumber: number;
  dayOfWeek: number;
  scheduledDate: string;
  sessionType: SessionType;
  targetDistanceKm: number | null;
  targetPaceMinPerKm: number | null;
  notes: string | null;
}

const LEVEL_CONFIG = {
  beginner: {
    minWeeks: 16, maxWeeks: 20,
    peakLongRun: 19, startLongRun: 5,
    peakVolume: 40,
    easyPace: 6.5,
    easyDistanceCap: 10,
  },
  intermediate: {
    minWeeks: 12, maxWeeks: 18,
    peakLongRun: 21, startLongRun: 9,
    peakVolume: 55,
    easyPace: 6.0,
    easyDistanceCap: 12,
  },
  advanced: {
    minWeeks: 10, maxWeeks: 16,
    peakLongRun: 23, startLongRun: 13,
    peakVolume: 70,
    easyPace: 5.5,
    easyDistanceCap: 14,
  },
  expert: {
    minWeeks: 8, maxWeeks: 14,
    peakLongRun: 24, startLongRun: 15,
    peakVolume: 80,
    easyPace: 5.0,
    easyDistanceCap: 15,
  },
};

// dayOfWeek offsets from Monday (0=Mon)
const SESSION_SLOTS: Record<number, Array<{ dayOffset: number; type: SessionType }>> = {
  3: [
    { dayOffset: 0, type: "easy_run" },
    { dayOffset: 2, type: "long_run" },
    { dayOffset: 5, type: "easy_run" },
  ],
  4: [
    { dayOffset: 0, type: "easy_run" },
    { dayOffset: 2, type: "tempo" },
    { dayOffset: 4, type: "long_run" },
    { dayOffset: 5, type: "easy_run" },
  ],
  5: [
    { dayOffset: 0, type: "easy_run" },
    { dayOffset: 1, type: "tempo" },
    { dayOffset: 3, type: "easy_run" },
    { dayOffset: 4, type: "interval" },
    { dayOffset: 5, type: "long_run" },
  ],
};

function round(v: number, step = 0.5): number {
  return Math.round(v / step) * step;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function getPaces(level: FitnessLevel, targetTimeMinutes?: number | null) {
  const cfg = LEVEL_CONFIG[level];
  let easyPace = cfg.easyPace;

  if (targetTimeMinutes) {
    const racePace = targetTimeMinutes / 21.1;
    easyPace = racePace + 1.5;
  }

  return {
    easy: easyPace,
    tempo: easyPace - 0.75,
    interval: easyPace - 1.25,
    longRun: easyPace + 0.25,
  };
}

function sessionNotes(
  type: SessionType,
  week: number,
  totalWeeks: number,
  taperWeeks: number,
  level: FitnessLevel
): string {
  const isTaper1 = week === totalWeeks - taperWeeks + 1;
  const isTaper2 = week >= totalWeeks - taperWeeks + 2;

  if (isTaper2) {
    if (type === "easy_run") return "Keep it easy — final taper week, save your legs.";
    if (type === "long_run") return "Short confidence run — relax and trust your training.";
  }
  if (isTaper1) {
    if (type === "easy_run") return "Start easing off — taper begins.";
    if (type === "tempo") return "Shorter tempo effort — keep sharpness without fatigue.";
    if (type === "interval") return "Light intervals — feel fast, stay fresh.";
    if (type === "long_run") return "Last big long run — nail the pacing.";
  }

  const progressPct = week / totalWeeks;
  if (type === "easy_run") {
    if (progressPct < 0.3) return "Conversational pace — you should be able to hold a full sentence.";
    if (progressPct < 0.6) return "Stay aerobic — easy effort builds your base.";
    return "Active recovery pace — legs should feel fresh after this.";
  }
  if (type === "tempo") {
    if (level === "beginner") return "Comfortably hard — about 7/10 effort. Short sentences only.";
    return "Lactate threshold pace — sustained effort, controlled breathing.";
  }
  if (type === "interval") {
    return "Hard repeats with equal rest. Each rep at 5k effort, full recovery between.";
  }
  if (type === "long_run") {
    if (progressPct > 0.7) return "Goal pace for the final third — practice your race finish.";
    return "Easy long run — time on feet, not pace. Stay comfortable.";
  }
  return "";
}

export function generatePlan(
  user: UserInput,
  planId: string,
  today: Date
): { totalWeeks: number; workouts: WorkoutInsert[] } {
  const cfg = LEVEL_CONFIG[user.fitnessLevel];
  const paces = getPaces(user.fitnessLevel, user.targetTimeMinutes);
  const slots = SESSION_SLOTS[user.daysPerWeek];
  const TAPER_WEEKS = 2;

  const raceDate = new Date(user.raceDate);
  const startDate = nextMonday(today);
  const totalDays = Math.floor((raceDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const rawWeeks = Math.floor(totalDays / 7);
  const totalWeeks = clamp(rawWeeks, cfg.minWeeks, cfg.maxWeeks);
  const buildWeeks = totalWeeks - TAPER_WEEKS;

  const workouts: WorkoutInsert[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const isTaper1 = w === totalWeeks - TAPER_WEEKS + 1;
    const isTaper2 = w >= totalWeeks - TAPER_WEEKS + 2;
    const taperFactor = isTaper2 ? 0.4 : isTaper1 ? 0.65 : 1;

    // Long run distance for this week
    let longRunDist: number;
    if (isTaper2) {
      longRunDist = 13;
    } else if (isTaper1) {
      longRunDist = round(cfg.peakLongRun * 0.8);
    } else {
      const t = buildWeeks <= 1 ? 1 : (w - 1) / (buildWeeks - 1);
      longRunDist = round(cfg.startLongRun + t * (cfg.peakLongRun - cfg.startLongRun));
    }

    const weekMonday = addDays(startDate, (w - 1) * 7);

    for (const slot of slots) {
      const scheduledDate = addDays(weekMonday, slot.dayOffset);
      const jsDay = scheduledDate.getDay(); // 0=Sun
      const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1; // convert to 0=Mon

      let type = slot.type;
      // During heavy taper week 2, convert intervals/tempo to easy
      if (isTaper2 && (type === "interval" || type === "tempo")) {
        type = "easy_run";
      }

      let distKm: number | null = null;
      let pace: number | null = null;

      if (type === "easy_run") {
        distKm = round(Math.min(longRunDist * 0.35 * taperFactor, cfg.easyDistanceCap), 0.5);
        distKm = Math.max(distKm, 3);
        pace = paces.easy;
      } else if (type === "tempo") {
        distKm = round(Math.max(longRunDist * 0.3 * taperFactor, 4), 0.5);
        pace = paces.tempo;
      } else if (type === "interval") {
        distKm = round(Math.max(longRunDist * 0.25 * taperFactor, 3), 0.5);
        pace = paces.interval;
      } else if (type === "long_run") {
        distKm = longRunDist;
        pace = paces.longRun;
      }

      const id = crypto.randomUUID();
      workouts.push({
        id,
        planId,
        userId: user.id,
        weekNumber: w,
        dayOfWeek,
        scheduledDate: isoDate(scheduledDate),
        sessionType: type,
        targetDistanceKm: distKm !== null ? round(distKm, 0.5) : null,
        targetPaceMinPerKm: pace !== null ? Math.round(pace * 100) / 100 : null,
        notes: sessionNotes(type, w, totalWeeks, TAPER_WEEKS, user.fitnessLevel),
      });
    }
  }

  return { totalWeeks, workouts };
}
