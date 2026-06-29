-- 0027: login unificado para agentes
-- Agrega must_set_password a app_users para el flujo de primer acceso via magic link.

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS must_set_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice para buscar usuarios por agente_id rápido (activar/desactivar)
CREATE INDEX IF NOT EXISTS idx_app_users_agente_id ON app_users(agente_id) WHERE agente_id IS NOT NULL;
