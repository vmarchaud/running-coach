import { useEffect, useState } from "react";
import { getHistorySessions, Session } from "../../api/sessions";
import { WorkoutLogRow } from "./WorkoutLogRow";
import { Spinner } from "../shared/Spinner";
import { Button } from "../shared/Button";
import { useI18n } from "../../lib/i18n/context";

interface Props {
  onWorkoutSelect: (id: number, isCompleted: boolean) => void;
  refreshKey?: number;
}

const PAGE_SIZE = 20;

export function HistoryList({ onWorkoutSelect, refreshKey }: Props) {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = (before?: string, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    getHistorySessions(before, PAGE_SIZE)
      .then(({ sessions: page }) => {
        setSessions((prev) => (append ? [...prev, ...page] : page));
        setHasMore(page.length === PAGE_SIZE);
      })
      .catch((e) => setError(e.message))
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

  if (error) {
    return (
      <div className="text-center py-20 text-neutral-400 px-6">
        <p>{t("common.somethingWrong")}</p>
        <p className="text-neutral-600 text-xs mt-2 break-words">{error}</p>
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
        <h1 className="text-2xl font-bold">{t("history.title")}</h1>
        <p className="text-neutral-400 text-sm mt-0.5">{t("history.subtitle")}</p>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-neutral-500 px-4">
          <div className="text-4xl mb-3">🏁</div>
          <p>{t("history.emptyTitle")}</p>
          <p className="text-sm mt-1">{t("history.emptySubtitle")}</p>
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
            {loadingMore ? t("history.loading") : t("history.loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
