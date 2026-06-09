-- =============================================================================
-- mentorcomercial · 0014_capacitacion_zoom.sql
-- Sesiones de capacitación con Zoom: link de la reunión, id de reunión (para
-- conciliar asistencia automática vía Zoom API/webhooks) y duración.
-- Aplicar DESPUÉS de 0013. Idempotente.
-- =============================================================================

alter table capacitaciones add column if not exists zoom_url        text;
alter table capacitaciones add column if not exists zoom_meeting_id text;  -- para el reporte de asistencia
alter table capacitaciones add column if not exists duracion_min    int default 60;
