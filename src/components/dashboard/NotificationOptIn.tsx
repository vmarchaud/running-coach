import { useEffect, useState } from "react";
import { getVapidPublicKey, subscribeToPush, unsubscribeFromPush } from "../../api/notifications";

function urlBase64ToUint8Array(base64Url: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
  return bytes.buffer;
}

type Status = "unsupported" | "loading" | "off" | "on" | "denied";

export function NotificationOptIn() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const { key } = await getVapidPublicKey();
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      await subscribeToPush(sub.toJSON() as PushSubscriptionJSON);
      setStatus("on");
    } catch {
      setStatus("off");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading" || status === "unsupported") return null;

  if (status === "denied") {
    return (
      <div className="bg-neutral-900 rounded-2xl p-4">
        <p className="text-sm font-semibold text-neutral-300">Notifications blocked</p>
        <p className="text-neutral-500 text-xs mt-1">
          Enable notifications for this site in your browser settings if you'd like check-ins from your coach.
        </p>
      </div>
    );
  }

  if (status === "on") {
    return (
      <div className="bg-neutral-900 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-400">🔔 Coach check-ins enabled</p>
          <p className="text-neutral-500 text-xs mt-0.5">
            You'll get a notification every couple of days with an update and plan.
          </p>
        </div>
        <button
          onClick={disable}
          disabled={busy}
          className="text-neutral-500 hover:text-red-400 text-xs flex-shrink-0 disabled:opacity-50"
        >
          Turn off
        </button>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-dashed border-neutral-700 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">🔔</span>
        <div>
          <p className="text-sm font-semibold">Get coach check-ins</p>
          <p className="text-neutral-500 text-xs">
            Every couple of days, your coach reviews your training and plans ahead — with a notification.
          </p>
        </div>
      </div>
      <button
        onClick={enable}
        disabled={busy}
        className="w-full text-center bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50 transition-colors"
      >
        {busy ? "Enabling..." : "Enable notifications"}
      </button>
    </div>
  );
}
