import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getSessionDetail, Session } from "../../api/sessions";
import { SportBadge, StatusBadge } from "../shared/Badge";
import { LogForm } from "./LogForm";
import { WorkoutLogDisplay } from "./WorkoutLogDisplay";
import { RunStreams } from "./RunStreams";
import { Spinner } from "../shared/Spinner";
import { Button } from "../shared/Button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "../../lib/i18n/context";

interface Props {
  sessionId: number;
  isCompleted: boolean;
  onBack: () => void;
  onLogged: () => void;
}

export function WorkoutDetail({ sessionId, isCompleted, onBack, onLogged }: Props) {
  const { t } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSessionDetail(sessionId, isCompleted)
      .then(setSession)
      .finally(() => setLoading(false));
  }, [sessionId, isCompleted]);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-20">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!session) return null;

  const dateLabel = new Date(session.dateStart + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-col pb-8">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={onBack} className="text-neutral-400 hover:text-white p-1">
          ← {t("workout.backButton")}
        </button>
      </div>
      <Separator />

      <div className="px-4 pt-5 flex flex-col gap-5">
        <div>
          <p className="text-neutral-500 text-sm">{dateLabel}</p>
          <h1 className="text-xl font-bold mt-1">{session.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <SportBadge sport={session.sport} />
            <StatusBadge isCompleted={session.isCompleted} />
          </div>
        </div>

        <Card>
          <CardContent className="grid grid-cols-2 gap-4">
            {/* A real nonzero distance only, not the raw != null check — Nolio
                returns a recorded 0 (not null) for duration-only sessions like
                strength work, where a "0 km" stat is just noise. */}
            {!!session.distance && (
              <div>
                <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">{t("workout.distanceStat")}</p>
                <p className="text-2xl font-bold">{session.distance} km</p>
              </div>
            )}
            <div>
              <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">{t("workout.durationStat")}</p>
              <p className="text-2xl font-bold">
                {session.duration != null ? `${Math.round(session.duration / 60)} ${t("workout.minutesUnit")}` : t("workout.noDataPlaceholder")}
              </p>
            </div>
            {session.elevationGain != null && (
              <div>
                <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">{t("workout.elevationStat")}</p>
                <p className="text-lg font-semibold">{session.elevationGain} m</p>
              </div>
            )}
            {session.rpe != null && (
              <div>
                <p className="text-neutral-500 text-xs uppercase tracking-wide mb-1">{t("workout.rpeStat")}</p>
                <p className="text-lg font-semibold">{session.rpe}/10</p>
              </div>
            )}
          </CardContent>
        </Card>

        {session.description && (
          <Card>
            <CardContent>
              <p className="text-neutral-500 text-xs uppercase tracking-wide mb-2">{t("workout.notesStat")}</p>
              <div className="typeset typeset-docs max-w-none text-neutral-300 text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{session.description}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {session.streams && session.streams.length > 1 && <RunStreams streams={session.streams} />}

        {session.isCompleted ? (
          <WorkoutLogDisplay session={session} />
        ) : showLogForm ? (
          <LogForm
            session={session}
            onSuccess={() => {
              setShowLogForm(false);
              onLogged();
            }}
            onCancel={() => setShowLogForm(false)}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-neutral-500 text-xs text-center">
              {t("workout.syncNote")}
            </p>
            <Button onClick={() => setShowLogForm(true)} fullWidth size="lg">
              {t("workout.logManuallyButton")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
