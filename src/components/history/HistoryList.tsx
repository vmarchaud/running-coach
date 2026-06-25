import { useEffect, useState } from "react";
import { getHistory, HistoryItem } from "../../api/history";
import { WorkoutLogRow } from "./WorkoutLogRow";
import { Spinner } from "../shared/Spinner";
import { Button } from "../shared/Button";

interface Props {
  onWorkoutSelect: (id: string) => void;
  refreshKey?: number;
}

export function HistoryList({ onWorkoutSelect, refreshKey }: Props) {
  const [logs, setLogs] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = (offset = 0, append = false) => {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);

    getHistory(20, offset)
      .then(({ logs: newLogs, total: t }) => {
        setLogs((prev) => (append ? [...prev, ...newLogs] : newLogs));
        setTotal(t);
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

  return (
    <div className="flex flex-col pb-4">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-neutral-400 text-sm mt-0.5">{total} workouts completed</p>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-16 text-neutral-500 px-4">
          <div className="text-4xl mb-3">🏁</div>
          <p>No completed workouts yet.</p>
          <p className="text-sm mt-1">Go crush your first session!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 px-4">
          {logs.map((item) => (
            <WorkoutLogRow
              key={item.id}
              item={item}
              onSelect={() => item.workout && onWorkoutSelect(item.workout.id)}
            />
          ))}
        </div>
      )}

      {logs.length < total && (
        <div className="px-4 mt-4">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => load(logs.length, true)}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
