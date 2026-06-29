"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui";
import { type UsoResumen, getUsoResumen } from "@/lib/queries/uso";

const ROL_LABEL: Record<string, string> = {
  owner: "Cecilia (Owner)",
  lider: "Líderes",
  agente: "Agentes",
};

const EVENTO_LABEL: Record<string, string> = {
  login: "Inicios de sesión",
  page_view: "Páginas visitadas",
  simulador_intento: "Intentos en simulador",
  simulador_completado: "Simulador completado",
  capacitacion_vista: "Capacitaciones vistas",
  reunion_abierta: "Reuniones abiertas",
  agente_activado: "Agentes activados",
  magic_link_solicitado: "Magic links pedidos",
  set_password: "Contraseñas configuradas",
};

export function UsoPlataforma() {
  const [data, setData] = useState<UsoResumen | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getUsoResumen().then(setData).catch(() => setError(true));
  }, []);

  if (error) return null;
  if (!data) return <p className="text-sm text-muted py-4">Cargando métricas…</p>;

  const totalSesiones = data.sesiones_por_rol.reduce((s, r) => s + Number(r.total), 0);

  return (
    <div className="space-y-4">
      {/* Sesiones por rol */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {data.sesiones_por_rol.map((r) => (
          <Card key={r.rol} className="p-4">
            <p className="text-xs text-muted mb-1">{ROL_LABEL[r.rol] ?? r.rol}</p>
            <p className="text-2xl font-bold text-foreground">{r.total}</p>
            <p className="text-xs text-muted mt-0.5">
              sesiones · {r.usuarios_unicos} usuario{Number(r.usuarios_unicos) !== 1 ? "s" : ""}
            </p>
          </Card>
        ))}
        {totalSesiones === 0 && (
          <Card className="p-4 sm:col-span-3">
            <p className="text-sm text-muted">Todavía no hay actividad registrada.</p>
          </Card>
        )}
      </div>

      {/* Agentes activos */}
      {data.agentes_activos_30d > 0 && (
        <Card className="p-4 flex items-center gap-4">
          <span className="text-3xl font-bold text-brand">{data.agentes_activos_30d}</span>
          <p className="text-sm text-muted leading-snug">
            agente{data.agentes_activos_30d !== 1 ? "s" : ""} usaron la app en los últimos 30 días
          </p>
        </Card>
      )}

      {/* Top acciones */}
      {data.top_eventos.length > 0 && (
        <Card className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Acciones más frecuentes (30 días)
          </p>
          <div className="space-y-2">
            {data.top_eventos.map((e) => {
              const max = data.top_eventos[0]?.total ?? 1;
              const pct = Math.round((Number(e.total) / Number(max)) * 100);
              return (
                <div key={e.evento} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-xs text-foreground truncate">
                    {EVENTO_LABEL[e.evento] ?? e.evento}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-soft overflow-hidden">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs tabular-nums text-muted">{e.total}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
