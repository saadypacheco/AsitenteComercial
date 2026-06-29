// Visualizaciones del dashboard ejecutivo "¡Hola Cecilia!" — SVG puro, sin libs.
// Design system índigo #6366f1 + semáforo (tailwind.config). Reusa Card de ui.tsx.
import type { ReactNode } from "react";

import type { Tone } from "@/lib/queries/executive";

const HEX: Record<Tone, string> = {
  brand: "#6366f1",
  danger: "#f04438",
  warning: "#f79009",
  ok: "#12b76a",
  neutral: "#98a2b3",
};

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  const large = a1 - a0 <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

/** Gauge semicircular de "Salud del equipo": tercios rojo/amarillo/verde + aguja. */
export function Gauge({ score, label, tono }: { score: number; label: string; tono: Tone }) {
  const cx = 100;
  const cy = 100;
  const r = 78;
  const needle = polar(cx, cy, r - 12, 180 + 1.8 * Math.min(100, Math.max(0, score)));
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-[220px]">
        <path d={arcPath(cx, cy, r, 180, 240)} stroke={HEX.danger} strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d={arcPath(cx, cy, r, 242, 298)} stroke={HEX.warning} strokeWidth="14" fill="none" />
        <path d={arcPath(cx, cy, r, 300, 360)} stroke={HEX.ok} strokeWidth="14" fill="none" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="#344054" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill="#344054" />
        <text x={cx} y="70" textAnchor="middle" fontSize="22" fontWeight="700" fill={HEX[tono]}>
          ♥
        </text>
      </svg>
      <p className="text-lg font-bold" style={{ color: HEX[tono] }}>
        {label}
      </p>
    </div>
  );
}

type Seg = { value: number; tone: Tone; label: string };

/** Donut de pendientes: anillo segmentado + total al centro + leyenda. */
export function Donut({ total, segments }: { total: number; segments: Seg[] }) {
  const r = 46;
  const C = 2 * Math.PI * r;
  const sum = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 120" className="h-[120px] w-[120px] shrink-0 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f4f6fa" strokeWidth="14" />
        {segments.map((s, i) => {
          const len = (s.value / sum) * C;
          const el = (
            <circle
              key={i}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={HEX[s.tone]}
              strokeWidth="14"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
        <text x="60" y="58" textAnchor="middle" className="rotate-90" fontSize="26" fontWeight="700" fill="#101828" transform="rotate(90 60 60)">
          {total}
        </text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: HEX[s.tone] }} />
            <span className="font-semibold text-ink">{s.value}</span>
            <span className="text-muted">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Sparkline de actividad (serie de 7 días): área suave índigo. */
export function Sparkline({ data }: { data: number[] }) {
  if (!data.length) return null;
  const w = 220;
  const h = 60;
  const max = Math.max(...data, 1);
  const step = w / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => [i * step, h - (v / max) * (h - 8) - 4]);
  const line = pts.map((p, i) => `${i ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path d={line} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Avatar circular con iniciales (ranking de agentes). */
export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
      {initials}
    </span>
  );
}

/** Punto de color para estados (activo/atención/inactivo, niveles). */
export function ToneDot({ tone }: { tone: Tone }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: HEX[tone] }} />;
}

export function tonePill(tone: Tone): { bg: string; text: string } {
  const map: Record<Tone, { bg: string; text: string }> = {
    brand: { bg: "bg-brand-soft", text: "text-brand" },
    danger: { bg: "bg-red-50", text: "text-danger" },
    warning: { bg: "bg-orange-50", text: "text-warning" },
    ok: { bg: "bg-emerald-50", text: "text-ok" },
    neutral: { bg: "bg-soft", text: "text-muted" },
  };
  return map[tone];
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  const c = tonePill(tone);
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}>{children}</span>;
}
