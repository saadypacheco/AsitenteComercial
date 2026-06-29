-- =============================================================================
-- mentorcomercial · 0015_acciones.sql
-- Bandeja de acciones de la IA ("el asistente que ACTÚA"): registro de las
-- acciones aprobadas/ejecutadas (mensaje a agente, email a cliente, recordatorio).
-- En modo simulado solo se registran; con el número/email conectado se envían real.
-- Aplicar DESPUÉS de 0014. Idempotente.
-- =============================================================================

create table if not exists acciones_log (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  ref_id       text,                     -- referencia a la fuente (ej. pend-<id>) → evita re-sugerir
  tipo         text,                     -- mensaje_agente | seguimiento_oportunidad | ayuda_agente | recordatorio
  destinatario text,
  canal        text,                     -- whatsapp | email
  mensaje      text,
  modo         text not null default 'simulado',  -- simulado | enviado
  created_at   timestamptz not null default now()
);
create index if not exists idx_acciones_log_tenant on acciones_log (tenant_id, created_at desc);
alter table acciones_log enable row level security;
