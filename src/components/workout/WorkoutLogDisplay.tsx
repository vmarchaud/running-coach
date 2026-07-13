import type { Session } from "../../api/sessions";
import { useI18n } from "../../lib/i18n/context";

interface Props {
  session: Session;
}

// Nolio's completed training record IS the log — nothing local to display beyond
// what's already shown above, just the confirmation and, if this came from a
// planned session (synced in automatically from Coros/Whoop), what it fulfilled.
export function WorkoutLogDisplay({ session }: Props) {
  const { t } = useI18n();
  return (
    <div className="bg-brand-950/30 border border-brand-900/50 rounded-2xl p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-brand-400 text-xl">✅</span>
        <span className="font-semibold text-brand-300">{t("workout.completedLabel")}</span>
      </div>
      {session.plannedName && (
        <p className="text-neutral-400 text-sm">{t("workout.fulfilledPlannedSession")} "{session.plannedName}"</p>
      )}
    </div>
  );
}
