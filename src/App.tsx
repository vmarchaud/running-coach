import { useState, useEffect } from "react";
import { OnboardingFlow } from "./components/onboarding/OnboardingFlow";
import { Dashboard } from "./components/dashboard/Dashboard";
import { FullPlan } from "./components/plan/FullPlan";
import { HistoryList } from "./components/history/HistoryList";
import { WorkoutDetail } from "./components/workout/WorkoutDetail";
import { BottomNav, Tab } from "./components/shared/BottomNav";
import { getMe } from "./api/users";

type View = "onboarding" | "app";

function getOrCreateUserId(): string {
  let id = localStorage.getItem("userId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("userId", id);
  }
  return id;
}

export default function App() {
  const [userId] = useState(getOrCreateUserId);
  const [view, setView] = useState<View | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getMe()
      .then(() => setView("app"))
      .catch(() => setView("onboarding"));
  }, []);

  if (view === null) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (view === "onboarding") {
    return (
      <OnboardingFlow
        userId={userId}
        onComplete={() => {
          setRefreshKey((k) => k + 1);
          setView("app");
        }}
      />
    );
  }

  if (selectedWorkoutId) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white max-w-lg mx-auto">
        <WorkoutDetail
          workoutId={selectedWorkoutId}
          onBack={() => setSelectedWorkoutId(null)}
          onLogged={() => {
            setRefreshKey((k) => k + 1);
            setSelectedWorkoutId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white max-w-lg mx-auto flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
        {tab === "dashboard" && (
          <Dashboard
            onWorkoutSelect={setSelectedWorkoutId}
            refreshKey={refreshKey}
          />
        )}
        {tab === "plan" && (
          <FullPlan
            onWorkoutSelect={setSelectedWorkoutId}
            refreshKey={refreshKey}
          />
        )}
        {tab === "history" && (
          <HistoryList
            onWorkoutSelect={setSelectedWorkoutId}
            refreshKey={refreshKey}
          />
        )}
      </div>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
