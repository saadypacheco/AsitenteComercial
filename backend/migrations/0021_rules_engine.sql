-- =============================================================================
-- mentorcomercial · 0021_rules_engine.sql
-- Motor de reglas de automatización: tabla de log para deduplicar disparos.
-- Aplicar DESPUÉS de 0020. Idempotente.
-- =============================================================================

create table if not exists rules_log (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  rule_id     text not null,      -- identificador de la regla, ej: 'inactivo_5d'
  agente_id   uuid,               -- agente objetivo (puede ser null para reglas globales)
  resultado   text not null,      -- 'whatsapp' | 'tarea' | 'escalado' | 'simulado'
  created_at  timestamptz not null default now()
);

create index if not exists idx_rules_log_tenant_rule
  on rules_log (tenant_id, rule_id, agente_id, created_at desc);

alter table rules_log enable row level security;
