import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface Point {
  x: number; // km
  y: number;
}

interface Props {
  label: string;
  unit: string;
  color: string; // hex stroke color
  points: Point[];
  formatValue?: (v: number) => string;
  invert?: boolean; // higher y-value renders lower on the chart (e.g. pace: faster = better = higher)
}

const HEIGHT = 130;
const PAD_TOP = 10;
const PAD_BOTTOM = 20;
const PAD_LEFT = 4;
const PAD_RIGHT = 4;

// Caps the number of rendered points so long runs (thousands of samples) stay
// smooth without bloating the SVG/DOM.
function downsample(points: Point[], maxPoints = 250): Point[] {
  if (points.length <= maxPoints) return points;
  const stride = Math.ceil(points.length / maxPoints);
  return points.filter((_, i) => i % stride === 0);
}

export function StreamChart({ label, unit, color, points, formatValue, invert }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const data = useMemo(() => downsample(points), [points]);

  if (data.length < 2) return null;

  const xs = data.map((p) => p.x);
  const ys = data.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const yRange = maxY - minY || 1;
  const xRange = maxX - minX || 1;

  const width = 1000; // viewBox units; scales to container via width="100%"
  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const toScreenX = (x: number) => PAD_LEFT + ((x - minX) / xRange) * plotW;
  const toScreenY = (y: number) => {
    const t = (y - minY) / yRange;
    return PAD_TOP + (invert ? t : 1 - t) * plotH;
  };

  const linePath = data.map((p, i) => `${i === 0 ? "M" : "L"}${toScreenX(p.x).toFixed(1)},${toScreenY(p.y).toFixed(1)}`).join(" ");

  const fmt = formatValue ?? ((v: number) => v.toFixed(0));
  const latest = data[data.length - 1];

  const xTicks = [minX, minX + xRange * 0.25, minX + xRange * 0.5, minX + xRange * 0.75, maxX];

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const targetX = minX + ((relX - PAD_LEFT) / plotW) * xRange;
    let nearest = 0;
    let bestDist = Infinity;
    for (let i = 0; i < data.length; i++) {
      const d = Math.abs(data[i].x - targetX);
      if (d < bestDist) {
        bestDist = d;
        nearest = i;
      }
    }
    setHoverIndex(nearest);
  };

  const hover = hoverIndex != null ? data[hoverIndex] : null;

  return (
    <Card>
      <CardContent>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium text-neutral-300">{label}</span>
        </div>
        <span className="text-sm font-semibold text-white">
          {fmt(latest.y)} <span className="text-neutral-500 font-normal">{unit}</span>
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        preserveAspectRatio="none"
        className="touch-none select-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {/* recessive baseline */}
        <line x1={PAD_LEFT} y1={HEIGHT - PAD_BOTTOM} x2={width - PAD_RIGHT} y2={HEIGHT - PAD_BOTTOM} stroke="#27272a" strokeWidth={1} />

        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {hover && (
          <>
            <line
              x1={toScreenX(hover.x)}
              y1={PAD_TOP}
              x2={toScreenX(hover.x)}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="#52525b"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            <circle cx={toScreenX(hover.x)} cy={toScreenY(hover.y)} r={5} fill={color} stroke="#0a0a0a" strokeWidth={2} />
          </>
        )}

        {xTicks.map((t, i) => (
          <text key={i} x={toScreenX(t)} y={HEIGHT - 4} fontSize={18} fill="#71717a" textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}>
            {t.toFixed(1)} km
          </text>
        ))}
      </svg>

      {hover && (
        <p className="text-xs text-neutral-400 mt-1">
          {hover.x.toFixed(2)} km — <span className="text-white font-medium">{fmt(hover.y)}</span> {unit}
        </p>
      )}
      </CardContent>
    </Card>
  );
}
