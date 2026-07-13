import { useState, useEffect } from "react";
import { LoginScreen } from "./components/auth/LoginScreen";
import { OnboardingFlow } from "./components/onboarding/OnboardingFlow";
import { Dashboard } from "./components/dashboard/Dashboard";
import { FullPlan } from "./components/plan/FullPlan";
import { HistoryList } from "./components/history/HistoryList";
import { CoachChat } from "./components/coach/CoachChat";
import { WorkoutDetail } from "./components/workout/WorkoutDetail";
import { BottomNav, Tab } from "./components/shared/BottomNav";
import { Settings } from "./components/settings/Settings";
import { useTextSize } from "./lib/useTextSize";
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

// A push notification (e.g. the coach's periodic check-in) deep-links to
// /?tab=coach — read it once on load and strip it from the URL, same pattern
// as the Nolio auth redirect above.
function consumeTabParam(): Tab | null {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (!tab) return null;

  window.history.replaceState({}, "", window.location.pathname);
  return (["dashboard", "plan", "history", "coach", "settings"] as const).includes(tab as Tab)
    ? (tab as Tab)
    : null;
}

// This SPA has no URL router — every screen (bottom-nav tab, workout detail
// drill-in) was plain React state with zero browser history integration, so
// the device/browser back button had nothing to pop at all and just left the
// app. NavState is the one shape pushed/read from history for every
// navigation, so back always lands somewhere sensible instead of exiting.
interface NavState {
  tab: Tab;
  sessionId: number | null;
  isCompleted: boolean;
}

export default function App() {
  const [view, setView] = useState<View | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(() => consumeTabParam() ?? "dashboard");
  const [selectedSession, setSelectedSession] = useState<{ id: number; isCompleted: boolean } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { textSize, setTextSize } = useTextSize();

  // Establish a concrete baseline entry once we enter the app, instead of
  // leaving history.state as the ambiguous `null` the page loaded with — every
  // pushState below builds on top of this, and popping back past it (state
  // null again) is handled as "back to the initial tab" in the listener.
  useEffect(() => {
    if (view === "app") {
      window.history.replaceState({ tab, sessionId: null, isCompleted: false } satisfies NavState, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const changeTab = (newTab: Tab) => {
    if (newTab === tab) return;
    window.history.pushState({ tab: newTab, sessionId: null, isCompleted: false } satisfies NavState, "");
    setSelectedSession(null);
    setTab(newTab);
  };

  const selectSession = (id: number, isCompleted: boolean) => {
    window.history.pushState({ tab, sessionId: id, isCompleted } satisfies NavState, "");
    setSelectedSession({ id, isCompleted });
  };

  // The explicit in-app Back button (and "close after logging a workout")
  // goes through history.back() too, rather than clearing state directly —
  // so browser back and in-app back always agree on what's currently open.
  const closeSelectedSession = () => window.history.back();

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const state = e.state as NavState | null;
      if (!state) {
        setSelectedSession(null);
        return;
      }
      setTab(state.tab);
      setSelectedSession(state.sessionId != null ? { id: state.sessionId, isCompleted: state.isCompleted } : null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
        <div className="w-8 h-8 border-2 border-neutral-700 border-t-brand-500 rounded-full animate-spin" />
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

  if (selectedSession) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto">
        <WorkoutDetail
          sessionId={selectedSession.id}
          isCompleted={selectedSession.isCompleted}
          onBack={closeSelectedSession}
          onLogged={() => {
            setRefreshKey((k) => k + 1);
            closeSelectedSession();
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
            onWorkoutSelect={selectSession}
            refreshKey={refreshKey}
          />
        )}
        {tab === "plan" && (
          <FullPlan
            onWorkoutSelect={selectSession}
            refreshKey={refreshKey}
          />
        )}
        {tab === "history" && (
          <HistoryList
            onWorkoutSelect={selectSession}
            refreshKey={refreshKey}
          />
        )}
        {tab === "coach" && <CoachChat />}
        {tab === "settings" && <Settings textSize={textSize} onTextSizeChange={setTextSize} />}
      </div>

      <BottomNav active={tab} onChange={changeTab} />
    </div>
  );
}
