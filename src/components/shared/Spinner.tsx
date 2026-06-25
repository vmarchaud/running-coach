export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-block w-6 h-6 border-2 border-neutral-700 border-t-emerald-500 rounded-full animate-spin ${className}`} />
  );
}
