import { Spinner } from "../shared/Spinner";

export function StepGenerating({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center">
      <div className="text-5xl">🗓️</div>
      <div>
        <h1 className="text-2xl font-bold">Building your plan, {name}!</h1>
        <p className="text-neutral-400 mt-2">Calculating your week-by-week training schedule...</p>
      </div>
      <Spinner className="w-10 h-10" />
      <div className="text-neutral-500 text-sm max-w-xs">
        Your personalized plan includes easy runs, tempo sessions, intervals, and a progressive long run each week.
      </div>
    </div>
  );
}
