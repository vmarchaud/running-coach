type Tab = "dashboard" | "plan" | "history" | "coach";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "This Week", icon: "🏃" },
    { id: "plan", label: "Plan", icon: "📋" },
    { id: "history", label: "History", icon: "📈" },
    { id: "coach", label: "Coach", icon: "💬" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 flex safe-bottom">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${
            active === tab.id ? "text-emerald-400" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <span className="text-xl">{tab.icon}</span>
          <span className="text-xs font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

export type { Tab };
