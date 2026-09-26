import React, { useMemo, useState } from 'react';

export interface TrendPoint {
  label: string;
  debts: number;
  payments: number;
}

interface TrendAreaChartProps {
  data: TrendPoint[];
  height?: number;
  formatValue?: (v: number) => string;
}

/**
 * TradingView-uslubidagi silliq (monotone) area chart — sof SVG bilan.
 * Recharts'ga ehtiyoj qoldirmaydi: responsive (viewBox), gradient fill,
 * minimal grid, toza tooltip, hover kesim chizig'i.
 */
export const TrendAreaChart: React.FC<TrendAreaChartProps> = ({
  data,
  height = 260,
  formatValue = (v) => new Intl.NumberFormat('uz-UZ').format(v),
}) => {
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = height;
  const PAD_L = 8;
  const PAD_R = 8;
  const PAD_T = 20;
  const PAD_B = 28;

  const { debtPath, paymentPath, debtArea, paymentArea, points } = useMemo(() => {
    if (!data.length) {
      return { debtPath: '', paymentPath: '', debtArea: '', paymentArea: '', points: [] as { x: number; y: number }[] };
    }
    const max = Math.max(...data.map((d) => Math.max(d.debts, d.payments)), 1);
    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;

    const xAt = (i: number) => PAD_L + i * step;
    const yAt = (v: number) => PAD_T + innerH - (v / max) * innerH;

    // Silliq egri (Catmull-Rom -> bezier): monotone effekt
    const smoothPath = (vals: number[]) => {
      const pts = vals.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
      if (pts.length < 2) return pts.length === 1 ? `M ${pts[0].x} ${pts[0].y}` : '';
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
      }
      return d;
    };

    const baseY = PAD_T + innerH;
    const dp = smoothPath(data.map((d) => d.debts));
    const pp = smoothPath(data.map((d) => d.payments));
    const lastX = xAt(data.length - 1);

    return {
      debtPath: dp,
      paymentPath: pp,
      debtArea: `${dp} L ${lastX} ${baseY} L ${PAD_L} ${baseY} Z`,
      paymentArea: `${pp} L ${lastX} ${baseY} L ${PAD_L} ${baseY} Z`,
      points: data.map((d, i) => ({ x: xAt(i), y: yAt(Math.max(d.debts, d.payments)) })),
    };
  }, [data, H]);

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50"
        style={{ height }}
      >
        <p className="text-sm text-gray-400 dark:text-slate-500 font-medium">Hozircha maʼlumot yoʻq</p>
      </div>
    );
  }

  const hovered = hover !== null ? data[hover] : null;

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 'auto' }}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="7 kunlik qarz va toʻlov tendensiyasi"
      >
        <defs>
          <linearGradient id="gradDebt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="gradPayment" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Minimal grid — 3 gorizontal chiziq */}
        {[0.25, 0.5, 0.75].map((r) => {
          const y = PAD_T + (H - PAD_T - PAD_B) * r;
          return (
            <line
              key={r}
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y}
              y2={y}
              stroke="#e5e7eb"
              className="dark:stroke-slate-700"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          );
        })}

        <path d={debtArea} fill="url(#gradDebt)" />
        <path d={paymentArea} fill="url(#gradPayment)" />
        <path d={debtPath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
        <path d={paymentPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

        {/* Hover kesimi va nuqtalar */}
        {hover !== null && points[hover] && (
          <>
            <line
              x1={points[hover].x}
              x2={points[hover].x}
              y1={PAD_T}
              y2={H - PAD_B}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
            <circle cx={points[hover].x} cy={points[hover].y} r="4.5" fill="#fff" stroke="#6366f1" strokeWidth="2.5" />
          </>
        )}

        {/* X o'qi yorliqlari */}
        {data.map((d, i) => (
          <text
            key={i}
            x={points[i].x}
            y={H - 8}
            textAnchor="middle"
            className="fill-gray-400 dark:fill-slate-500"
            style={{ fontSize: 11, fontWeight: 600 }}
          >
            {d.label}
          </text>
        ))}

        {/* Hover zonasi */}
        {data.map((_, i) => {
          const step = (W - PAD_L - PAD_R) / Math.max(data.length - 1, 1);
          const x = PAD_L + i * step;
          return (
            <rect
              key={i}
              x={x - step / 2}
              y={0}
              width={step}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div
          className="pointer-events-none absolute top-2 rounded-xl bg-slate-900/95 text-white text-xs px-3 py-2 shadow-xl backdrop-blur-sm"
          style={{ left: `${((points[hover!].x || 0) / W) * 100}%`, transform: 'translateX(-50%)' }}
        >
          <p className="font-bold mb-1">{hovered.label}</p>
          <p className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            Qarz: {formatValue(hovered.debts)}
          </p>
          <p className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Toʻlov: {formatValue(hovered.payments)}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs font-semibold text-gray-500 dark:text-slate-400">
        <span className="flex items-center gap-2">
          <span className="w-3 h-1.5 rounded-full bg-indigo-500" /> Berilgan qarz
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-1.5 rounded-full bg-emerald-500" /> Qaytgan toʻlov
        </span>
      </div>
    </div>
  );
};

export default TrendAreaChart;
