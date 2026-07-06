import { useEffect, useState } from "react";
import { getNolioStatus, disconnectNolio, redirectToNolioLogin, NolioStatus } from "../../api/nolio";

export function NolioConnect() {
  const [status, setStatus] = useState<NolioStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNolioStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  const handleSignOut = async () => {
    await disconnectNolio();
    localStorage.removeItem("userId");
    window.location.href = "/";
  };

  if (loading) return null;

  if (!status?.connected) {
    return (
      <div className="bg-neutral-900 border border-yellow-900/50 rounded-2xl p-4">
        <p className="text-sm font-semibold text-yellow-400">Nolio session expired</p>
        <p className="text-neutral-500 text-xs mt-1 mb-3">Please sign in again to continue.</p>
        <button
          onClick={redirectToNolioLogin}
          className="text-emerald-400 text-sm font-medium hover:text-emerald-300"
        >
          Reconnect with Nolio →
        </button>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 rounded-2xl p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏅</span>
        <div>
          <p className="text-sm font-semibold text-emerald-400">Connected via Nolio</p>
          <p className="text-neutral-400 text-xs">
            {status.nolioUser?.firstName} {status.nolioUser?.lastName}
          </p>
        </div>
      </div>
      <button
        onClick={handleSignOut}
        className="text-neutral-500 hover:text-red-400 text-xs transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
