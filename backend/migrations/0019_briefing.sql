-- =============================================================================
-- mentorcomercial · 0019_briefing.sql
-- Briefing diario por WhatsApp a la dueña (Feature E): un resumen del día que el
-- sistema arma y envía solo, una vez por día, a la hora de cierre de jornada.
-- Aplicar DESPUÉS de 0018. Idempotente.
--
-- Config por tenant (en la propia tabla tenants):
--   owner_wa_jid     → número PERSONAL de la dueña, destinatario del briefing.
--                      (Distinto de ia_wa_jid, que es el número observador de captura.)
--   briefing_enabled → on/off del envío automático.
--   briefing_hora    → hora (ET) a partir de la cual se dispara el envío del día.
-- =============================================================================

alter table tenants add column if not exists owner_wa_jid     text;
alter table tenants add column if not exists briefing_enabled boolean not null default true;
alter table tenants add column if not exists briefing_hora     int     not null default 18;  -- 18:00 ET

-- Bitácora de briefings enviados. La idempotencia del envío automático la da el
-- chequeo "no existe uno tipo 'auto' para hoy"; los 'manual' (botón de prueba) no
-- bloquean. Inmutable: cada envío queda registrado con su texto y modo.
create table if not exists briefing_log (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  fecha       date not null,                          -- día ET del briefing
  tipo        text not null default 'auto'            -- auto (programado) | manual (prueba)
                check (tipo in ('auto','manual')),
  jid         text,                                   -- destinatario
  modo        text not null default 'simulado',       -- simulado | real | error
  texto       text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_briefing_log_tenant on briefing_log (tenant_id, fecha desc);
alter table briefing_log enable row level security;
