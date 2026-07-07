import { useState, useEffect } from "react";
import { LoginScreen } from "./components/auth/LoginScreen";
import { OnboardingFlow } from "./components/onboarding/OnboardingFlow";
import { Dashboard } from "./components/dashboard/Dashboard";
import { FullPlan } from "./components/plan/FullPlan";
import { HistoryList } from "./components/history/HistoryList";
import { CoachChat } from "./components/coach/CoachChat";
import { WorkoutDetail } from "./components/workout/WorkoutDetail";
import { BottomNav, Tab } from "./components/shared/BottomNav";
import { getMe } from "./api/users";

type View = "login" | "onboarding" | "app";

function consumeAuthRedirect(): { userId: string | null; error: string | null } {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("nolioUserId");
  const error = params.get("nolioError");

  if (userId || error) {
    window.history.replaceState({}, "", window.location.pathname);
  }
  if (userId) {
    localStorage.setItem("userId", userId);
  }
  return { userId, error };
}

export default function App() {
  const [view, setView] = useState<View | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const { userId: redirectedUserId, error } = consumeAuthRedirect();
    if (error) setLoginError(error);

    const userId = redirectedUserId ?? localStorage.getItem("userId");
    if (!userId) {
      setView("login");
      return;
    }

    getMe()
      .then(() => setView("app"))
      .catch((e: any) => {
        if (e.status === 401) {
          localStorage.removeItem("userId");
          setView("login");
        } else {
          setView("onboarding");
        }
      });
  }, []);

  if (view === null) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (view === "login") {
    return <LoginScreen error={loginError} />;
  }

  if (view === "onboarding") {
    return (
      <OnboardingFlow
        userId={localStorage.getItem("userId") ?? ""}
        onComplete={() => {
          setRefreshKey((k) => k + 1);
          setView("app");
        }}
      />
    );
  }

  if (selectedWorkoutId) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto">
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
    <div className="h-screen bg-neutral-950 text-white max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto flex flex-col">
      <div className={`flex-1 min-h-0 pb-20 ${tab === "coach" ? "flex flex-col" : "overflow-y-auto"}`}>
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
        {tab === "coach" && <CoachChat />}
      </div>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
