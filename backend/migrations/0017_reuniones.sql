-- =============================================================================
-- mentorcomercial · 0017_reuniones.sql
-- Reuniones que se procesan solas: acta generada por IA a partir de la
-- transcripción (resumen + temas + acciones/compromisos). Las acciones extraídas
-- se materializan como pendientes (trazables a la reunión vía mensaje? no: link en
-- el acta). Aplicar DESPUÉS de 0016. Idempotente.
-- =============================================================================

create table if not exists reunion_actas (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  titulo        text not null,
  tipo          text not null default 'lideres' check (tipo in ('formacion','lideres','otro')),
  fecha         timestamptz not null default now(),
  zoom_meeting_id text,
  transcripcion text,
  resumen       text,
  temas         jsonb not null default '[]',
  acciones      jsonb not null default '[]',   -- [{titulo, agente}]
  fuente        text not null default 'simulado', -- simulado | zoom
  created_at    timestamptz not null default now()
);
create index if not exists idx_reunion_actas_tenant on reunion_actas (tenant_id, created_at desc);
alter table reunion_actas enable row level security;
