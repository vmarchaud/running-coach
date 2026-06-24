import { useEffect, useState } from "react";

function getNextRun(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(3, 0, 0, 0);
  if (now.getUTCHours() >= 3) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function App() {
  const [timeLeft, setTimeLeft] = useState({ h: "00", m: "00", s: "00" });

  useEffect(() => {
    function tick() {
      const diff = Math.max(0, getNextRun().getTime() - Date.now());
      setTimeLeft({
        h: pad(Math.floor(diff / 3_600_000)),
        m: pad(Math.floor((diff % 3_600_000) / 60_000)),
        s: pad(Math.floor((diff % 60_000) / 1_000)),
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-white p-6">
      <p className="text-sm font-medium tracking-widest uppercase text-neutral-400 mb-4">
        Next update in
      </p>
      <div className="flex gap-3 text-5xl sm:text-7xl font-mono font-bold tabular-nums">
        <span>{timeLeft.h}</span>
        <span className="text-neutral-600">:</span>
        <span>{timeLeft.m}</span>
        <span className="text-neutral-600">:</span>
        <span>{timeLeft.s}</span>
      </div>
      <p className="mt-6 text-sm text-neutral-500">Every night at 3:00 AM UTC</p>
    </main>
  );
}
