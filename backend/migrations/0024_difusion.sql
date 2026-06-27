-- 0024: difusion de actas de reunion por mensajeria interna

-- Vincular actas con sesiones de capacitacion (nullable, puede ser una reunion fuera del programa)
ALTER TABLE reunion_actas ADD COLUMN IF NOT EXISTS capacitacion_id UUID REFERENCES capacitaciones(id) ON DELETE SET NULL;

-- Estado de difusion para alertas a Cecilia
ALTER TABLE reunion_actas ADD COLUMN IF NOT EXISTS estado_difusion TEXT NOT NULL DEFAULT 'pendiente';

-- Resumen editable y aprobado por Cecilia antes de difundir
ALTER TABLE reunion_actas ADD COLUMN IF NOT EXISTS resumen_aprobado TEXT;

-- Tabla de mensajes internos enviados a lideres y agentes
CREATE TABLE IF NOT EXISTS mensajes_internos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   TEXT NOT NULL,
    reunion_acta_id UUID REFERENCES reunion_actas(id) ON DELETE CASCADE,
    destinatario_id UUID NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
    tipo        TEXT NOT NULL DEFAULT 'resumen_reunion',  -- 'resumen_reunion' | 'tarea' | 'aviso'
    titulo      TEXT,
    cuerpo      TEXT,
    leido       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_internos_tenant ON mensajes_internos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_internos_destinatario ON mensajes_internos(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_internos_acta ON mensajes_internos(reunion_acta_id);
