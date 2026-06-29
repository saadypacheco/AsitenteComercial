-- =============================================================================
-- mentorcomercial · 0023_acciones_log_audit.sql
-- Agrega trazabilidad de quién aprobó cada acción en /acciones.
-- Aplicar DESPUÉS de 0022. Idempotente.
-- =============================================================================

alter table acciones_log
  add column if not exists aprobado_por uuid references app_users(id) on delete set null;

create index if not exists idx_acciones_log_aprobado
  on acciones_log (aprobado_por, created_at desc);
