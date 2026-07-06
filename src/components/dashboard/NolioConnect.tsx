import { useEffect, useState } from "react";
import { getNolioStatus, openNolioConnect, disconnectNolio, NolioStatus } from "../../api/nolio";
import { Button } from "../shared/Button";

interface Props {
  onConnected?: () => void;
}

export function NolioConnect({ onConnected }: Props) {
  const [status, setStatus] = useState<NolioStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const load = () => {
    setLoading(true);
    getNolioStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await openNolioConnect(localStorage.getItem("userId") ?? "");
      await load();
      onConnected?.();
    } catch {
      // ignore — user likely closed the popup
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectNolio();
    load();
  };

  if (loading) return null;

  if (status?.connected && status.nolioUser) {
    return (
      <div className="bg-neutral-900 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏅</span>
          <div>
            <p className="text-sm font-semibold text-emerald-400">Nolio connected</p>
            <p className="text-neutral-400 text-xs">
              {status.nolioUser.firstName} {status.nolioUser.lastName}
            </p>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-neutral-500 hover:text-red-400 text-xs transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-dashed border-neutral-700 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">🏅</span>
        <div>
          <p className="text-sm font-semibold">Connect Nolio</p>
          <p className="text-neutral-500 text-xs">Sync your training data with Nolio</p>
        </div>
      </div>
      <Button
        onClick={handleConnect}
        disabled={connecting}
        fullWidth
        size="sm"
        variant="secondary"
      >
        {connecting ? "Connecting..." : "Connect with Nolio"}
      </Button>
      {status?.reason === "token_expired" && (
        <p className="text-yellow-500 text-xs mt-2">Session expired — please reconnect.</p>
      )}
    </div>
  );
}
