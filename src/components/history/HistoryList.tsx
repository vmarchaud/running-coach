import { useEffect, useState } from "react";
import { getHistorySessions, Session } from "../../api/sessions";
import { WorkoutLogRow } from "./WorkoutLogRow";
import { Spinner } from "../shared/Spinner";
import { Button } from "../shared/Button";

interface Props {
  onWorkoutSelect: (id: number, isCompleted: boolean) => void;
  refreshKey?: number;
}

const PAGE_SIZE = 20;

export function HistoryList({ onWorkoutSelect, refreshKey }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const load = (before?: string, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    getHistorySessions(before, PAGE_SIZE)
      .then(({ sessions: page }) => {
        setSessions((prev) => (append ? [...prev, ...page] : page));
        setHasMore(page.length === PAGE_SIZE);
      })
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  };

  useEffect(() => { load(); }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  const loadMore = () => {
    const oldest = sessions[sessions.length - 1];
    if (!oldest) return;
    // Nolio's `to` filter is date-only (no time), so re-using the oldest loaded
    // date_start would re-fetch it — step back a day to avoid duplicates/loops.
    const cursor = new Date(oldest.dateStart + "T00:00:00");
    cursor.setDate(cursor.getDate() - 1);
    load(cursor.toISOString().slice(0, 10), true);
  };

  return (
    <div className="flex flex-col pb-4">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-neutral-400 text-sm mt-0.5">Completed trainings from Nolio</p>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-neutral-500 px-4">
          <div className="text-4xl mb-3">🏁</div>
          <p>No completed workouts yet.</p>
          <p className="text-sm mt-1">Go crush your first session!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 px-4">
          {sessions.map((s) => (
            <WorkoutLogRow key={s.id} session={s} onSelect={() => onWorkoutSelect(s.id, true)} />
          ))}
        </div>
      )}

      {hasMore && sessions.length > 0 && (
        <div className="px-4 mt-4">
          <Button variant="secondary" fullWidth onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
