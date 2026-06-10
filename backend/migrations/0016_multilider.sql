-- =============================================================================
-- mentorcomercial · 0016_multilider.sql
-- Multi-líder: un usuario del panel puede estar acotado a un nodo de la jerarquía
-- de agentes (su equipo = ese agente + todos sus subordinados vía superior_id).
--   - app_users.agente_id NULL  → OWNER (Cecilia): ve TODO.
--   - app_users.agente_id = X    → LÍDER: ve solo el sub-árbol de X.
-- El usuario líder demo se siembra en el backend (ensure_default_user) para no
-- hashear contraseñas en SQL. Aplicar DESPUÉS de 0015. Idempotente.
-- =============================================================================

alter table app_users add column if not exists agente_id uuid references agentes(id);
