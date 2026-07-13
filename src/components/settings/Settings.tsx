import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useI18n } from "../../lib/i18n/context";
import { TextSize } from "../../lib/useTextSize";
import { Language } from "../../lib/i18n/dictionaries";
import { StrengthMaxes } from "./StrengthMaxes";

interface Props {
  textSize: TextSize;
  onTextSizeChange: (size: TextSize) => void;
}

function OptionRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors border",
            value === opt.value
              ? "bg-brand-500 text-white border-brand-500"
              : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Settings({ textSize, onTextSizeChange }: Props) {
  const { t, language, setLanguage } = useI18n();

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="px-4 pt-6">
        <h1 className="font-display text-3xl uppercase leading-none">{t("settings.title")}</h1>
      </div>

      <div className="px-4">
        <Card>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm font-semibold">{t("settings.textSize")}</p>
            <OptionRow
              value={textSize}
              onChange={(v) => onTextSizeChange(v as TextSize)}
              options={[
                { value: "sm", label: t("settings.textSizeSmall") },
                { value: "md", label: t("settings.textSizeMedium") },
                { value: "lg", label: t("settings.textSizeLarge") },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="px-4">
        <Card>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm font-semibold">{t("settings.language")}</p>
            <OptionRow
              value={language}
              onChange={(v) => setLanguage(v as Language)}
              options={[
                { value: "en", label: t("settings.languageEnglish") },
                { value: "fr", label: t("settings.languageFrench") },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="px-4">
        <StrengthMaxes />
      </div>
    </div>
  );
}
