export interface Session {
  id: number;
  name: string;
  sport: string | null;
  sportId: number | null;
  dateStart: string;
  hourStart: string | null;
  duration: number | null;
  distance: number | null;
  elevationGain: number | null;
  rpe: number | null;
  description: string | null;
  isCompleted: boolean;
  // Only set on completed sessions that fulfilled a planned one (e.g. synced in
  // automatically from Coros) — Nolio stamps these descriptive fields on the
  // completed record but exposes no exact ID linking the two.
  plannedName: string | null;
  plannedSportId: number | null;
}

// A planned training built from a structured_workout (interval steps, e.g.
// 5x1km) can come back from Nolio with distance: 0 at the top level — the
// real distance only lives inside the structured steps, distributed across
// possibly-nested repetition blocks. Sum it as a fallback so a session isn't
// silently invisible in weekly distance totals just because it was built with
// detailed steps instead of a flat distance field.
function sumStructuredDistanceMeters(nodes: any[] | undefined): number {
  if (!Array.isArray(nodes)) return 0;
  let total = 0;
  for (const node of nodes) {
    if (!node) continue;
    if (node.type === "repetition" && Array.isArray(node.steps)) {
      total += sumStructuredDistanceMeters(node.steps) * (node.value ?? 1);
    } else if (node.step_duration_type === "distance" && typeof node.step_duration_value === "number") {
      total += node.step_duration_value;
    }
  }
  return total;
}

// Last-resort fallback for sessions created before top-level distance was
// consistently filled (or where the coach only wrote a text description with
// no structured_workout at all): pull the first "<number> km" mentioned in
// the description, e.g. "10 km easy (RPE 3-4, HR < 145) + 6x20\" strides".
// Deliberately just the first match, not a sum — a description can mention
// several distances (splits, strides) and the leading one is reliably the
// session's total in how the coach writes these.
function estimateDistanceFromDescription(description: string | undefined): number | null {
  const match = /(\d+(?:\.\d+)?)\s*km\b/i.exec(description ?? "");
  return match ? parseFloat(match[1]) : null;
}

// Nolio's raw training objects (from get/training/ and get/planned/training/) share
// the same core fields; we normalize both into one shape and tag which list they
// came from.
export function mapNolioTraining(t: any, isCompleted: boolean): Session {
  const structuredDistanceKm = sumStructuredDistanceMeters(t.structured_workout) / 1000;

  return {
    id: t.nolio_id,
    name: t.name,
    sport: t.sport ?? null,
    sportId: t.sport_id ?? null,
    dateStart: t.date_start,
    hourStart: t.hour_start || null,
    duration: t.duration ?? null,
    // `||`, not `??`, is deliberate: Nolio returns a real 0 (not null/undefined)
    // for sessions with no recorded distance, so a nullish check alone would
    // never fall through to the fallbacks below.
    distance:
      t.distance ||
      (structuredDistanceKm > 0 ? Math.round(structuredDistanceKm * 100) / 100 : null) ||
      estimateDistanceFromDescription(t.description),
    elevationGain: t.elevation_gain ?? null,
    rpe: t.rpe ?? null,
    description: t.description || null,
    isCompleted,
    plannedName: isCompleted ? t.planned_name || null : null,
    plannedSportId: isCompleted ? t.planned_sport_id ?? null : null,
  };
}

// A completed training fulfills a planned one when Nolio stamped planned_* fields
// on it (synced in from a device against that day's plan) matching the planned
// session's date and sport. There's no exact ID to match on, so date+sport is the
// best signal Nolio's API exposes.
export function isFulfilledBy(planned: Session, completed: Session): boolean {
  return (
    completed.plannedSportId != null &&
    completed.plannedSportId === planned.sportId &&
    completed.dateStart === planned.dateStart
  );
}
