-- =============================================================================
-- mentorcomercial · 0006_gestion_core.sql
-- Rebanada MÍNIMA del núcleo de gestión (Producto ② / futura F-002) necesaria
-- para que el dashboard ejecutivo "¡Hola Cecilia!" muestre datos REALES en vez de
-- placeholders: agentes (con jerarquía variable), pendientes/acciones y
-- capacitaciones. Reusa la tabla commercial_events (eventos comerciales) ya existente.
--
-- NOTA DE ALCANCE: esto NO es la F-002 completa (sin importador CSV, sin CRUD,
-- sin el modelo de datos maestro entero). Es lo justo para alimentar el dashboard
-- hoy. Cuando se abra F-002 formalmente, estas tablas se amplían, no se tiran.
--
-- Aplicar DESPUÉS de 0001/0003/0004/0005. Idempotente.
-- Ref: docs/architect-journey.md (next-steps F-002) · spec F-001 US2 (FR-020)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (a) AGENTES — persona gestionada por la líder. Jerarquía VARIABLE (superior_id
--     auto-referente, profundidad arbitraria). El celular ES la identidad de
--     WhatsApp → puente con lo capturado en F-001 (contact_id).
-- -----------------------------------------------------------------------------
create table if not exists agentes (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  contact_id    uuid references contacts(id),        -- match por celular con la captura (F-001)
  nombre        text not null,
  apellido      text,
  celular       text,                                -- = WhatsApp
  email         text,
  estado        text not null default 'activo'
                  check (estado in ('activo','inactivo','baja')),
  superior_id   uuid references agentes(id),         -- jerarquía variable (auto-ref)
  origen_alta   text default 'manual',               -- manual / csv / capacitacion / telegram
  ciudad        text,
  region        text,
  idioma        text default 'es',
  fecha_alta    date not null default current_date,
  fecha_baja    date,
  created_at    timestamptz not null default now()
);
create index if not exists idx_agentes_tenant   on agentes (tenant_id);
create index if not exists idx_agentes_contact  on agentes (contact_id);
create index if not exists idx_agentes_superior on agentes (superior_id);

-- -----------------------------------------------------------------------------
-- (b) PENDIENTES / ACCIONES — el "cerrar el día a día". Estado con ciclo de vida
--     pendiente → en_proceso → cerrado. Prioridad para alertas críticas.
--     Trazable al mensaje que lo originó (mensaje_origen → messages, FR-003).
-- -----------------------------------------------------------------------------
create table if not exists pendientes (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  agente_id      uuid references agentes(id),
  titulo         text not null,
  descripcion    text,
  tipo           text not null default 'seguimiento'
                   check (tipo in ('seguimiento','reclamo','consulta','tarea','oportunidad')),
  prioridad      text not null default 'medio'
                   check (prioridad in ('critico','alto','medio','bajo')),
  estado         text not null default 'pendiente'
                   check (estado in ('pendiente','en_proceso','cerrado')),
  creado_por     text not null default 'ia',          -- ia / human
  mensaje_origen uuid references messages(id),
  fecha_cierre   timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists idx_pendientes_tenant on pendientes (tenant_id);
create index if not exists idx_pendientes_agente on pendientes (agente_id);
create index if not exists idx_pendientes_estado on pendientes (estado, prioridad);

-- -----------------------------------------------------------------------------
-- (c) CAPACITACIONES — onboarding/formación (Producto ③). Mínimo para el bloque
--     de capacitaciones + la alerta "capacitación sin asistentes" + timeline.
-- -----------------------------------------------------------------------------
create table if not exists capacitaciones (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  nombre        text not null,
  descripcion   text,
  estado        text not null default 'programada'
                  check (estado in ('programada','en_curso','finalizada','cancelada')),
  instructor_id uuid references agentes(id),
  fecha         timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists capacitacion_asistencia (
  capacitacion_id uuid not null references capacitaciones(id) on delete cascade,
  agente_id       uuid not null references agentes(id) on delete cascade,
  asistio         boolean not null default false,
  inscripto_at    timestamptz not null default now(),
  primary key (capacitacion_id, agente_id)
);

-- -----------------------------------------------------------------------------
-- (d) RLS — toda tabla de negocio aislada por tenant (Principio II). El backend
--     escribe/lee con conexión directa (superusuario → bypassa RLS en local).
-- -----------------------------------------------------------------------------
alter table agentes                enable row level security;
alter table pendientes             enable row level security;
alter table capacitaciones         enable row level security;
alter table capacitacion_asistencia enable row level security;

drop policy if exists agentes_tenant_read on agentes;
create policy agentes_tenant_read on agentes
  for select using (tenant_id = current_tenant_id());

drop policy if exists pendientes_tenant_read on pendientes;
create policy pendientes_tenant_read on pendientes
  for select using (tenant_id = current_tenant_id());

drop policy if exists capacitaciones_tenant_read on capacitaciones;
create policy capacitaciones_tenant_read on capacitaciones
  for select using (tenant_id = current_tenant_id());

drop policy if exists capacitacion_asistencia_tenant_read on capacitacion_asistencia;
create policy capacitacion_asistencia_tenant_read on capacitacion_asistencia
  for select using (
    exists (select 1 from capacitaciones c
            where c.id = capacitacion_id and c.tenant_id = current_tenant_id())
  );
