-- Corre las migraciones REALES del proyecto (montadas en /migrations).
-- Se saltea 0002 (pgmq): en local la cola usa el fallback de tabla (01_queue_local.sql).
\i /migrations/0001_init.sql
\i /migrations/0003_rls.sql
\i /migrations/0004_event_catalog.sql
\i /migrations/0005_daily_views.sql
\i /migrations/0006_gestion_core.sql
\i /migrations/0007_executive.sql
\i /migrations/0008_auth_and_tenant.sql
\i /migrations/0009_executive_i18n.sql
\i /migrations/0010_seed_i18n.sql
\i /migrations/0011_agentes_geo.sql
