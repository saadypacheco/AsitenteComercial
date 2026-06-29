-- =============================================================================
-- mentorcomercial · 0004_event_catalog.sql
-- F-001: alinear el modelo al catálogo clarificado de la spec + soporte de
--        edición/borrado inmutable + búsqueda bilingüe.
-- Ref: specs/001-captura-whatsapp-bd/data-model.md · research.md (R5, R7)
--
-- Aplicar DESPUÉS de 0001/0002/0003. Seguro de correr sobre BD sin datos
-- productivos (el ALTER de check requiere drop+add).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (a) Catálogo de eventos comerciales = el de la spec (FR-013).
--     Antes: oportunidad/renovacion/reclamo/seguimiento/capacitacion/tarea/consulta
--     Ahora: venta/objecion/seguimiento/consulta
--     ('objecion' sin tilde = valor canónico en BD; el label "objeción" vive en i18n)
-- -----------------------------------------------------------------------------
alter table commercial_events drop constraint if exists commercial_events_type_check;
alter table commercial_events
  add constraint commercial_events_type_check
  check (type in ('venta','objecion','seguimiento','consulta'));

-- -----------------------------------------------------------------------------
-- (b) Índice FTS bilingüe (es/en). 'spanish' aplicaba stemming castellano y
--     degradaba el inglés; 'simple' es neutral y predecible para el demo (R7).
-- -----------------------------------------------------------------------------
drop index if exists idx_messages_fts;
create index if not exists idx_messages_fts on messages
  using gin (to_tsvector('simple', coalesce(body,'')));

-- -----------------------------------------------------------------------------
-- (c) Ciclo de vida del mensaje en WhatsApp (editado/borrado) SIN mutar
--     messages. Append-only: el original queda intacto (FR-017).
-- -----------------------------------------------------------------------------
create table if not exists message_states (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  message_id   uuid not null references messages(id) on delete cascade,
  state        text not null check (state in ('captured','edited','deleted')),
  new_body     text,                       -- contenido tras edición (si aplica)
  raw          jsonb,                      -- payload del evento de edición/borrado
  occurred_at  timestamptz not null default now()
);
create index if not exists idx_message_states_msg on message_states (message_id, occurred_at);

-- -----------------------------------------------------------------------------
-- (d) RLS para message_states (Principio II: toda tabla de negocio con RLS).
-- -----------------------------------------------------------------------------
alter table message_states enable row level security;

drop policy if exists message_states_tenant_read on message_states;
create policy message_states_tenant_read on message_states
  for select using (tenant_id = current_tenant_id());

-- NOTA: como el resto del esquema, no se crean políticas de escritura para anon;
-- toda escritura pasa por el backend con service_role (bypassa RLS).
