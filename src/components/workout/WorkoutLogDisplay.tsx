import type { Session } from "../../api/sessions";

interface Props {
  session: Session;
}

// Nolio's completed training record IS the log — nothing local to display beyond
// what's already shown above, just the confirmation and, if this came from a
// planned session (synced in automatically from Coros/Whoop), what it fulfilled.
export function WorkoutLogDisplay({ session }: Props) {
  return (
    <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-2xl p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-emerald-400 text-xl">✅</span>
        <span className="font-semibold text-emerald-300">Completed</span>
      </div>
      {session.plannedName && (
        <p className="text-neutral-400 text-sm">Fulfilled planned session: "{session.plannedName}"</p>
      )}
    </div>
  );
}
