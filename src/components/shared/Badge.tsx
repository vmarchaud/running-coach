import { Badge as ShadcnBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SPORT_COLORS: Record<string, string> = {
  Running: "bg-blue-900/60 text-blue-300",
  Trail: "bg-purple-900/60 text-purple-300",
  Cycling: "bg-orange-900/60 text-orange-300",
  Swimming: "bg-cyan-900/60 text-cyan-300",
};

export function SportBadge({ sport }: { sport: string | null }) {
  const label = sport ?? "Session";
  return (
    <ShadcnBadge variant="outline" className={cn("border-transparent h-auto", SPORT_COLORS[label] ?? "bg-neutral-800 text-neutral-300")}>
      {label}
    </ShadcnBadge>
  );
}

export function StatusBadge({ isCompleted }: { isCompleted: boolean }) {
  return (
    <ShadcnBadge
      variant="outline"
      className={cn("border-transparent h-auto", isCompleted ? "bg-brand-900/60 text-brand-300" : "bg-neutral-800 text-neutral-400")}
    >
      {isCompleted ? "Done" : "Planned"}
    </ShadcnBadge>
  );
}
