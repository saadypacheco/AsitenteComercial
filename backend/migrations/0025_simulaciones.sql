-- 0025: Tracking de uso del simulador por agente + configuración de escenarios
BEGIN;

CREATE TABLE IF NOT EXISTS simulaciones (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agente_id   UUID        NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
  escenario   VARCHAR(100) NOT NULL,
  puntaje     INT         CHECK (puntaje BETWEEN 0 AND 100),
  duracion_seg INT,
  feedback    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS simulaciones_tenant_agente ON simulaciones(tenant_id, agente_id);
CREATE INDEX IF NOT EXISTS simulaciones_tenant_escenario ON simulaciones(tenant_id, escenario);

CREATE TABLE IF NOT EXISTS escenarios_simulador (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clave        VARCHAR(100) NOT NULL,
  nombre_es    VARCHAR(200) NOT NULL,
  nombre_en    VARCHAR(200) NOT NULL,
  descripcion_es TEXT,
  descripcion_en TEXT,
  activo       BOOLEAN     DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, clave)
);

-- Seed escenarios por defecto para todos los tenants existentes
INSERT INTO escenarios_simulador (tenant_id, clave, nombre_es, nombre_en, descripcion_es, descripcion_en, activo)
SELECT
  t.id,
  e.clave,
  e.nombre_es,
  e.nombre_en,
  e.desc_es,
  e.desc_en,
  true
FROM tenants t
CROSS JOIN (VALUES
  ('precio',         'Objeción de precio',        'Price objection',    'El prospecto dice que es muy caro',                  'The prospect says it''s too expensive'),
  ('primera_llamada','Primera llamada en frío',   'Cold first call',    'Primer contacto sin contexto previo',                'First contact with no prior context'),
  ('cierre',         'Técnica de cierre',         'Closing technique',  'Llevar al prospecto a tomar la decisión',            'Guide the prospect to make a decision'),
  ('renovacion',     'Renovación de póliza',      'Policy renewal',     'Cliente existente con duda de renovar',              'Existing client unsure about renewing'),
  ('producto',       'Consulta de producto',      'Product inquiry',    'El prospecto pide información sin intención clara',  'Prospect asking for info with no clear intent')
) AS e(clave, nombre_es, nombre_en, desc_es, desc_en)
ON CONFLICT (tenant_id, clave) DO NOTHING;

COMMIT;
