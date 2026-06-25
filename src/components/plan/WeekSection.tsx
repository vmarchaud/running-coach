import { useState } from "react";
import type { Workout } from "../../api/dashboard";
import { WorkoutCard } from "../workout/WorkoutCard";

interface Props {
  weekNum: number;
  workouts: Workout[];
  isCurrentWeek: boolean;
  defaultOpen: boolean;
  onWorkoutSelect: (id: string) => void;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekSection({ weekNum, workouts, isCurrentWeek, defaultOpen, onWorkoutSelect }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const completedCount = workouts.filter((w) => !!w.log).length;
  const totalKm = workouts.reduce((s, w) => s + (w.targetDistanceKm ?? 0), 0);
  const isTaper = workouts.some((w) => w.notes?.toLowerCase().includes("taper"));

  return (
    <div className="border-b border-neutral-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${isCurrentWeek ? "text-emerald-400" : "text-white"}`}>
                Week {weekNum}
              </span>
              {isCurrentWeek && (
                <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded-full">
                  Current
                </span>
              )}
              {isTaper && (
                <span className="text-xs bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded-full">
                  Taper
                </span>
              )}
            </div>
            <div className="text-neutral-500 text-xs">
              {completedCount}/{workouts.length} done · {Math.round(totalKm * 10) / 10} km
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {workouts.map((w) => (
              <div
                key={w.id}
                className={`w-2 h-2 rounded-full ${
                  w.log ? "bg-emerald-500" : "bg-neutral-700"
                }`}
              />
            ))}
          </div>
          <span className="text-neutral-500 text-sm">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {workouts.map((w) => (
            <WorkoutCard
              key={w.id}
              workout={w}
              dayLabel={DAY_NAMES[w.dayOfWeek]}
              onClick={() => onWorkoutSelect(w.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
