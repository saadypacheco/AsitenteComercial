-- Registro de uso de la plataforma: sesiones, navegación y acciones clave.
-- Fire-and-forget: si falla no bloquea al usuario. Se usa para medir adopción.
CREATE TABLE IF NOT EXISTS activity_log (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID        REFERENCES app_users(id) ON DELETE SET NULL,
    agente_id   UUID        REFERENCES agentes(id) ON DELETE SET NULL,
    rol         TEXT        NOT NULL,                          -- owner, lider, agente
    evento      TEXT        NOT NULL,                          -- login, page_view, simulador_intento, etc.
    detalle     JSONB,                                         -- contexto libre: página, módulo, score, etc.
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_created
    ON activity_log(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_rol_evento
    ON activity_log(tenant_id, rol, evento, created_at DESC);
