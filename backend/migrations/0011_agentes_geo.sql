-- =============================================================================
-- mentorcomercial · 0011_agentes_geo.sql
-- Geolocalización de agentes para verlos en un mapa (Producto ②).
-- lat/lng opcionales (en producción se geocodifican al cargar el agente).
-- Las coordenadas del seed se cargan en infra/local-init/05_seed_geo.sql.
-- Aplicar DESPUÉS de 0010. Idempotente.
-- =============================================================================

alter table agentes add column if not exists lat double precision;
alter table agentes add column if not exists lng double precision;
