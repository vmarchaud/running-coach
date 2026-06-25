interface Props {
  days: number;
  raceDate: string;
}

export function RaceCountdown({ days, raceDate }: Props) {
  const formatted = new Date(raceDate + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-gradient-to-br from-emerald-950 to-neutral-900 border border-emerald-900/50 rounded-2xl p-5">
      <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-1">Race Day</p>
      <div className="flex items-end gap-2">
        <span className="text-5xl font-black tabular-nums">{days}</span>
        <span className="text-neutral-400 mb-1.5">days to go</span>
      </div>
      <p className="text-neutral-500 text-sm mt-1">{formatted}</p>
    </div>
  );
}
