import { useState } from "react";
import { logSession } from "../../api/sessions";
import type { Session } from "../../api/sessions";
import { Button } from "../shared/Button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useI18n } from "../../lib/i18n/context";

interface Props {
  session: Session;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LogForm({ session, onSuccess, onCancel }: Props) {
  const { t } = useI18n();
  const [distance, setDistance] = useState(session.distance?.toString() ?? "");
  const [durationH, setDurationH] = useState("");
  const [durationM, setDurationM] = useState("");
  const [rpe, setRpe] = useState(session.rpe?.toString() ?? "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const totalSeconds = ((parseInt(durationH || "0") * 60) + parseInt(durationM || "0")) * 60;

    await logSession({
      name: session.name,
      sportId: session.sportId ?? 2,
      dateStart: session.dateStart,
      distance: distance ? parseFloat(distance) : undefined,
      duration: totalSeconds > 0 ? totalSeconds : undefined,
      rpe: rpe ? parseInt(rpe) : undefined,
      description: notes || undefined,
    });
    onSuccess();
  };

  return (
    <Card className="p-5">
      <CardContent className="p-0 flex flex-col gap-5">
        <h3 className="font-semibold text-lg">{t("workout.logWorkoutTitle")}</h3>

        <div>
          <Label htmlFor="log-distance" className="text-neutral-500 text-xs uppercase tracking-wide block mb-2">{t("workout.distanceLabel")}</Label>
          <Input
            id="log-distance"
            type="number"
            step="0.1"
            min="0"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder={session.distance?.toString() ?? "0.0"}
          />
        </div>

        <div>
          <Label className="text-neutral-500 text-xs uppercase tracking-wide block mb-2">{t("workout.durationLabel")}</Label>
          <div className="flex gap-3 items-center">
            <Input
              type="number"
              min="0"
              max="5"
              value={durationH}
              onChange={(e) => setDurationH(e.target.value)}
              placeholder="0"
              className="flex-1 text-center"
            />
            <span className="text-neutral-500">{t("workout.durationHoursUnit")}</span>
            <Input
              type="number"
              min="0"
              max="59"
              value={durationM}
              onChange={(e) => setDurationM(e.target.value)}
              placeholder="00"
              className="flex-1 text-center"
            />
            <span className="text-neutral-500">{t("workout.durationMinutesUnit")}</span>
          </div>
        </div>

        <div>
          <Label htmlFor="log-rpe" className="text-neutral-500 text-xs uppercase tracking-wide block mb-2">{t("workout.rpeLabel")}</Label>
          <Input
            id="log-rpe"
            type="number"
            min="1"
            max="10"
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="log-notes" className="text-neutral-500 text-xs uppercase tracking-wide block mb-2">{t("workout.notesLabel")}</Label>
          <Textarea
            id="log-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("workout.notesPlaceholder")}
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} fullWidth>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={saving} fullWidth>
            {saving ? t("workout.saving") : t("common.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
