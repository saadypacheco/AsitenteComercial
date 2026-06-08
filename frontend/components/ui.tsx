// Primitivas de UI del design system portado del mockup (Producto ②).
// Tema claro/profesional, mobile-first (Principio VI). Índigo #6366f1 + semáforo.
import type { ReactNode } from "react";

type Tone = "brand" | "danger" | "warning" | "ok" | "neutral";

const topBorder: Record<Tone, string> = {
  brand: "border-t-brand",
  danger: "border-t-danger",
  warning: "border-t-warning",
  ok: "border-t-ok",
  neutral: "border-t-line",
};

const numColor: Record<Tone, string> = {
  brand: "text-brand",
  danger: "text-danger",
  warning: "text-warning",
  ok: "text-ok",
  neutral: "text-ink",
};

const leftBorder: Record<Tone, string> = {
  brand: "border-l-brand",
  danger: "border-l-danger",
  warning: "border-l-warning",
  ok: "border-l-ok",
  neutral: "border-l-line",
};

/** Tarjeta base: panel blanco, borde fino, sombra suave, esquinas redondeadas. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-white shadow-card ${className}`}>
      {children}
    </div>
  );
}

/** Etiqueta de sección en índigo, mayúsculas, tracking — separa los bloques. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-brand">
      {children}
    </h2>
  );
}

/** KPI del "Pulso del día": número grande + label, con borde superior de semáforo. */
export function Kpi({
  value,
  label,
  tone = "brand",
}: {
  value: ReactNode;
  label: string;
  tone?: Tone;
}) {
  return (
    <div
      className={`rounded-xl border border-line border-t-[3px] bg-white px-3 py-3 shadow-card ${topBorder[tone]}`}
    >
      <p className={`text-2xl font-bold leading-none ${numColor[tone]}`}>{value}</p>
      <p className="mt-1.5 text-[11px] leading-tight text-muted">{label}</p>
    </div>
  );
}

/** Tarjeta de acción/ítem con barra lateral de semáforo (pendientes, listas). */
export function AccentCard({
  children,
  tone = "brand",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-line border-l-4 bg-white px-4 py-3 shadow-card ${leftBorder[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

/** Estado "conectando con el backend" — honesto, no es un placeholder vacío. */
export function WiringNote({ children }: { children: ReactNode }) {
  return (
    <Card className="px-4 py-5">
      <p className="flex items-start gap-2 text-sm text-muted">
        <span className="mt-0.5 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-warning" />
        <span>{children}</span>
      </p>
    </Card>
  );
}

/** Pill chico (tipo de chat, conteo). */
export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  const bg: Record<Tone, string> = {
    brand: "bg-brand-soft text-brand",
    danger: "bg-red-50 text-danger",
    warning: "bg-orange-50 text-warning",
    ok: "bg-emerald-50 text-ok",
    neutral: "bg-soft text-muted",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${bg[tone]}`}>
      {children}
    </span>
  );
}
