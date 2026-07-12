import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  className?: string;
}

// Tailwind statically scans source for literal class names, so the indicator
// color can't be built from an arbitrary interpolated string — this map keeps
// every variant spelled out so the scanner picks it up.
const INDICATOR_COLOR: Record<string, string> = {
  "bg-brand-500": "[&>[data-slot=progress-indicator]]:bg-brand-500",
  "bg-purple-500": "[&>[data-slot=progress-indicator]]:bg-purple-500",
};

export function ProgressBar({ value, max, color = "bg-brand-500", className = "" }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <Progress
      value={pct}
      className={cn(
        "h-2 bg-neutral-800 [&>[data-slot=progress-indicator]]:duration-500",
        INDICATOR_COLOR[color] ?? INDICATOR_COLOR["bg-brand-500"],
        className
      )}
    />
  );
}
