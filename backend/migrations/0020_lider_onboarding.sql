-- =============================================================================
-- mentorcomercial · 0020_lider_onboarding.sql
-- Onboarding del líder: primeros pasos guiados tras ser designado líder.
-- Aplicar DESPUÉS de 0019. Idempotente.
-- =============================================================================

alter table app_users
  add column if not exists lider_onboarding_completado boolean not null default false,
  add column if not exists lider_onboarding_visto_at   timestamptz;
