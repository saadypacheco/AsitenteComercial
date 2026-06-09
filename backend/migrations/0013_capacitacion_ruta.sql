-- =============================================================================
-- mentorcomercial · 0013_capacitacion_ruta.sql
-- Ruta de Capacitación / Onboarding (Producto ③): etapas del programa + progreso
-- por agente. Alimenta la pantalla con barra de progreso, stepper de etapas y
-- progreso por agente. Las "sesiones" agendadas siguen en capacitaciones (calendario).
-- Aplicar DESPUÉS de 0012. Idempotente.
-- =============================================================================

create table if not exists capacitacion_etapas (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  nombre       text not null,
  nombre_en    text,
  descripcion  text,
  orden        int  not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists etapa_progreso (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  agente_id     uuid not null references agentes(id) on delete cascade,
  etapa_id      uuid not null references capacitacion_etapas(id) on delete cascade,
  estado        text not null default 'pendiente'
                  check (estado in ('pendiente','en_curso','completado')),
  completado_at timestamptz,
  unique (agente_id, etapa_id)
);
create index if not exists idx_etapa_progreso_agente on etapa_progreso (agente_id);

alter table capacitacion_etapas enable row level security;
alter table etapa_progreso       enable row level security;
