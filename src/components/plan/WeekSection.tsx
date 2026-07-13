import { useState } from "react";
import type { Session } from "../../api/sessions";
import { WorkoutCard } from "../workout/WorkoutCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useI18n } from "../../lib/i18n/context";

interface Props {
  weekStart: string;
  sessions: Session[];
  isCurrentWeek: boolean;
  defaultOpen: boolean;
  onWorkoutSelect: (id: number, isCompleted: boolean) => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WeekSection({ weekStart, sessions, isCurrentWeek, defaultOpen, onWorkoutSelect }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(defaultOpen);

  const totalKm = sessions.reduce((s, x) => s + (x.distance ?? 0), 0);
  const label = new Date(weekStart + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="border-b border-neutral-800">
      <CardHeader className="p-0">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-900/50 transition-colors"
        >
          <div className="text-left">
            <div className="flex items-center gap-2">
              <CardTitle className={isCurrentWeek ? "text-brand-400" : "text-white"}>
                {t("plan.weekOf").replace("{date}", label)}
              </CardTitle>
              {isCurrentWeek && (
                <span className="text-xs bg-brand-900/50 text-brand-400 px-2 py-0.5 rounded-full">
                  {t("plan.current")}
                </span>
              )}
            </div>
            <div className="text-neutral-500 text-xs">
              {sessions.length} {sessions.length === 1 ? t("plan.sessionCountOne") : t("plan.sessionCountOther")} · {Math.round(totalKm * 10) / 10} km
            </div>
          </div>

          <span className="text-neutral-500 text-sm">{open ? "▲" : "▼"}</span>
        </button>
      </CardHeader>

      {open && (
        <CardContent className="pb-4 flex flex-col gap-2">
          {sessions.map((s) => (
            <WorkoutCard
              key={s.id}
              session={s}
              dayLabel={DAY_NAMES[new Date(s.dateStart + "T00:00:00").getDay()]}
              onClick={() => onWorkoutSelect(s.id, s.isCompleted)}
            />
          ))}
        </CardContent>
      )}
    </div>
  );
}
