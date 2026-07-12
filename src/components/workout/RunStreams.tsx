import type { StreamPoint } from "../../api/sessions";
import { StreamChart } from "./StreamChart";
import { formatPace } from "../../lib/dateUtils";

interface Props {
  streams: StreamPoint[];
}

const HR_COLOR = "#f87171"; // red-400
const PACE_COLOR = "#4ade80"; // green-400
const POWER_COLOR = "#2dd4bf"; // teal-400
const CADENCE_COLOR = "#c084fc"; // purple-400

const PACE_CAP_MIN_PER_KM = 20;

export function RunStreams({ streams }: Props) {
  if (!streams || streams.length < 2) return null;

  const toKm = (s: StreamPoint) => s.distance / 1000;

  const hrPoints = streams
    .filter((s) => s.heartrate != null && s.heartrate > 0)
    .map((s) => ({ x: toKm(s), y: s.heartrate! }));

  const pacePoints = streams
    .filter((s) => s.pace != null && s.pace > 0)
    .map((s) => ({ x: toKm(s), y: Math.min(1000 / s.pace! / 60, PACE_CAP_MIN_PER_KM) }));

  const powerPoints = streams
    .filter((s) => s.watts != null && s.watts > 0)
    .map((s) => ({ x: toKm(s), y: s.watts! }));

  const cadencePoints = streams
    .filter((s) => s.cadence != null && s.cadence > 0)
    .map((s) => ({ x: toKm(s), y: s.cadence! }));

  return (
    <div className="flex flex-col gap-3">
      {hrPoints.length > 1 && (
        <StreamChart label="Heart rate" unit="bpm" color={HR_COLOR} points={hrPoints} />
      )}
      {pacePoints.length > 1 && (
        <StreamChart label="Pace" unit="/km" color={PACE_COLOR} points={pacePoints} invert formatValue={formatPace} />
      )}
      {powerPoints.length > 1 && (
        <StreamChart label="Power" unit="W" color={POWER_COLOR} points={powerPoints} />
      )}
      {cadencePoints.length > 1 && (
        <StreamChart label="Cadence" unit="ppm" color={CADENCE_COLOR} points={cadencePoints} />
      )}
    </div>
  );
}
