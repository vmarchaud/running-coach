import { useEffect, useState } from "react";
import { getNolioStatus, disconnectNolio, redirectToNolioLogin, NolioStatus } from "../../api/nolio";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "../../lib/i18n/context";

export function NolioConnect() {
  const { t } = useI18n();
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
      <Card className="border-yellow-900/50">
        <CardContent>
          <p className="text-sm font-semibold text-yellow-400">{t("dashboard.nolioSessionExpiredTitle")}</p>
          <p className="text-neutral-500 text-xs mt-1 mb-3">{t("dashboard.nolioSessionExpiredBody")}</p>
          <button
            onClick={redirectToNolioLogin}
            className="text-brand-400 text-sm font-medium hover:text-brand-300"
          >
            {t("dashboard.reconnectWithNolio")}
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏅</span>
          <div>
            <p className="text-sm font-semibold text-brand-400">{t("dashboard.connectedViaNolio")}</p>
            <p className="text-neutral-400 text-xs">
              {status.nolioUser?.firstName} {status.nolioUser?.lastName}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="text-neutral-500 hover:text-red-400 text-xs transition-colors"
        >
          {t("dashboard.signOut")}
        </button>
      </CardContent>
    </Card>
  );
}
