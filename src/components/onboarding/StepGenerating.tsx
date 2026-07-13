import { Spinner } from "../shared/Spinner";
import { useI18n } from "../../lib/i18n/context";

export function StepGenerating({ name }: { name: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center">
      <div className="text-5xl">🗓️</div>
      <div>
        <h1 className="text-2xl font-bold">
          {t("onboarding.generatingTitle").replace("{name}", name)}
        </h1>
        <p className="text-neutral-400 mt-2">{t("onboarding.generatingSubtitle")}</p>
      </div>
      <Spinner className="w-10 h-10" />
      <div className="text-neutral-500 text-sm max-w-xs">
        {t("onboarding.generatingDetail")}
      </div>
    </div>
  );
}
