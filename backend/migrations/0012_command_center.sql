-- =============================================================================
-- mentorcomercial · 0012_command_center.sql
-- Campos extra para el "Centro de Control Comercial": valor económico de eventos
-- (potencial / ventas $) y cliente + VIP en pendientes (tarjetas enriquecidas).
-- En producción se llenan con datos reales; el seed de demo los carga en 06.
-- Aplicar DESPUÉS de 0011. Idempotente.
-- =============================================================================

alter table commercial_events add column if not exists valor numeric;        -- USD potencial / venta
alter table pendientes        add column if not exists cliente text;          -- cliente asociado
alter table pendientes        add column if not exists cliente_en text;       -- traducción demo
alter table pendientes        add column if not exists vip boolean not null default false;
