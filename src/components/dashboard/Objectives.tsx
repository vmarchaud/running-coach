import type { Objective } from "../../api/sessions";
import { SportBadge } from "../shared/Badge";

interface Props {
  main: Objective | null;
  secondary: Objective[];
}

function dateLabel(dateStart: string): string {
  return new Date(dateStart + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function Objectives({ main, secondary }: Props) {
  if (!main && secondary.length === 0) return null;

  return (
    <div className="bg-neutral-900 rounded-2xl p-4">
      <p className="text-neutral-500 text-xs uppercase tracking-wide mb-3">Goals · from Nolio</p>

      {main && (
        <div className="flex items-center gap-2 mb-2">
          <SportBadge sport={main.sport} />
          <span className="text-sm font-medium truncate">{main.name}</span>
          <span className="text-neutral-500 text-xs ml-auto flex-shrink-0">{dateLabel(main.dateStart)}</span>
        </div>
      )}

      {secondary.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-neutral-800">
          {secondary.map((o) => (
            <div key={o.id} className="flex items-center gap-2 text-sm text-neutral-400">
              <span className="truncate">{o.name}</span>
              <span className="text-neutral-600 text-xs ml-auto flex-shrink-0">{dateLabel(o.dateStart)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
