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

// Nolio's raw training objects (from get/training/ and get/planned/training/) share
// the same core fields; we normalize both into one shape and tag which list they
// came from.
export function mapNolioTraining(t: any, isCompleted: boolean): Session {
  return {
    id: t.nolio_id,
    name: t.name,
    sport: t.sport ?? null,
    sportId: t.sport_id ?? null,
    dateStart: t.date_start,
    hourStart: t.hour_start || null,
    duration: t.duration ?? null,
    distance: t.distance ?? null,
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
