# Data Model — F-001

**Fase 1 del plan.** Mapea las entidades de la spec al esquema físico ya scaffoldeado
(`backend/migrations/0001_init.sql`) y define los **cambios** que F-001 necesita (migración `0004`).
RLS multi-tenant (`0003`) y cola durable (`0002`) ya están.

Leyenda: ✅ ya existe en `0001` · 🔧 requiere cambio en `0004` · 🆕 nueva en `0004`.

---

## Entidades de la spec ↔ tablas

| Entidad (spec) | Tabla física | Estado |
|---|---|---|
| Mensaje (inmutable) | `messages` | ✅ |
| Grupo / Chat | `chats` (+ `chat_participants`) | ✅ |
| Participante / Remitente | `contacts` | ✅ |
| Transcripción | `transcriptions` | ✅ (idioma se llena por Whisper) |
| Evento comercial | `commercial_events` (+ `event_sources` para traza) | 🔧 catálogo de `type` |
| Resumen del día | **vista** `daily_activity` / consulta, no tabla | 🆕 (vista o query) |
| Media (no-texto/audio) | `media` | ✅ |
| Estado de gestión | `message_triage` | ✅ |
| **Estado WhatsApp (editado/borrado)** | `message_states` | 🆕 |

> Tablas presentes en `0001` que **NO** se usan en F-001 (son para fases posteriores): `tasks`,
> `message_entities`, `message_embeddings`, `clients`/`products` (opcionalmente referenciadas por un
> evento, pero la extracción de cliente/producto formal es F1+). No se borran; quedan latentes.

---

## Campos clave por entidad (F-001)

### `messages` — fuente de verdad inmutable ✅
- `tenant_id`, `wa_message_id` (idempotencia: `unique(tenant_id, wa_message_id)`), `chat_id`, `sender_id`
- `type` (text/image/audio/video/document/location), `body` (texto o caption), `wa_timestamp` (timestamptz, hora real)
- `raw jsonb` (payload completo del bridge), `quoted_msg_id`, `direction`
- **Regla:** nunca se hace `UPDATE`. Solo `insert ... on conflict do nothing`.

### `media` — metadata de no-texto ✅
- 1:N con `messages` (`message_id`), `mime_type`, `storage_path`, `size_bytes`, `downloaded`
- Cubre FR-016: imagen/doc/sticker/ubicación se registran con metadata, **sin analizar contenido** en F-001.

### `transcriptions` — texto de audios ✅
- PK = `message_id` (1:1 con un message `type='audio'`)
- `text`, `language` (autodetectado por Whisper — **multi-idioma**, no fijar `'es'` por defecto), `engine`, `confidence`
- Trazabilidad (FR-006/SC-006): la PK ya enlaza al mensaje origen.
- 🔧 nota: el `default 'es'` de `language` en la versión de `docs/ARQUITECTURA.md` **no** debe replicarse; en `0001` ya está sin default — correcto.

### `commercial_events` — evento inferido por IA 🔧
- `type` **debe** restringirse al catálogo de la spec. Cambio en `0004`:
  - **Antes:** `check (type in ('oportunidad','renovacion','reclamo','seguimiento','capacitacion','tarea','consulta'))`
  - **Después:** `check (type in ('venta','objecion','seguimiento','consulta'))`
  - (`objecion` sin tilde como valor canónico en BD; el label con tilde "objeción" vive en la UI/i18n.)
- `confidence numeric` (umbral: bajo el umbral **no se inserta** evento — US4-AC3)
- `created_by` = `'ai'` (vs `'human'`) para distinguir hecho vs inferencia (FR-015)
- `title`, `description`, `importance`, `client_id?`, `product_id?` (opcionales en F-001)

### `event_sources` — trazabilidad N:M ✅
- `(event_id, message_id)` PK. **Invariante:** no existe `commercial_events` sin ≥1 fila acá
  (FR-014 / SC-007). Se inserta el evento y sus orígenes en la **misma transacción**.

### `message_triage` — estado de gestión ✅
- `status` (new/seen/actioned/ignored), `importance` (red/yellow/white), `category`
- Alimenta la sección **cruda** del dashboard (actividad/volumen). Separado de `messages` para no tocar la verdad.

### 🆕 `message_states` — ciclo de vida WhatsApp (editado/borrado)
Modela FR-017 sin mutar `messages`:
```sql
create table if not exists message_states (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  message_id   uuid not null references messages(id) on delete cascade,
  state        text not null check (state in ('captured','edited','deleted')),
  new_body     text,                       -- contenido tras edición (si aplica)
  raw          jsonb,                      -- payload del evento de edición/borrado
  occurred_at  timestamptz not null default now()
);
create index if not exists idx_message_states_msg on message_states (message_id, occurred_at);
```
- **Append-only.** El original en `messages` queda intacto; la edición/borrado se registra acá.
- RLS: se agrega a la lista de tablas con `tenant_id` directo en la política de lectura (0004).

---

## Vista "Resumen del día" (FR-007/FR-011) 🆕

No es una tabla; es lo que alimenta "¿Qué pasó hoy?". Combina **hecho** (actividad cruda) e
**inferencia** (eventos), claramente diferenciados (FR-015). Definición conceptual (la consulta exacta
se afina en implement):

- **Actividad cruda (hecho):** por `chat`, conteo de `messages` con `wa_timestamp` dentro de la
  ventana ET de hoy; último mensaje; volumen total; lista navegable.
- **Eventos comerciales (inferencia):** `commercial_events` de hoy con su `type`, resumen y
  **link a `event_sources` → messages** (traza obligatoria).

Ventana "hoy" (FR-018), determinista:
```sql
-- hoy ET, como rango sobre wa_timestamp (timestamptz)
where wa_timestamp >= (date_trunc('day', now() at time zone 'America/New_York')) at time zone 'America/New_York'
  and wa_timestamp <  (date_trunc('day', now() at time zone 'America/New_York') + interval '1 day') at time zone 'America/New_York'
```

---

## Reglas de integridad y RLS

- **Todas** las tablas de negocio con RLS habilitado (`0003`); `message_states` se suma en `0004`.
- Toda escritura pasa por el backend (service_role, bypassa RLS). El frontend solo **lee** filtrado por `tenant_id` vía JWT.
- Invariantes verificables (mapean a Success Criteria):
  - `unique(tenant_id, wa_message_id)` → SC-002 (0 duplicados).
  - Sin pérdida en caídas: webhook persiste antes de ack a la cola → SC-001.
  - `commercial_events` ⟹ existe `event_sources` → SC-007.
  - `transcriptions.message_id` FK → SC-006.

---

## Migración 0004 — alcance (lo que tasks debe generar)

`backend/migrations/0004_event_catalog.sql`:
1. **Alterar** el `check` de `commercial_events.type` al catálogo de la spec (`venta/objecion/seguimiento/consulta`).
2. **Recrear** el índice FTS de `messages` con config `'simple'` (bilingüe es/en, ver research R7).
3. **Crear** `message_states` (FR-017) + su índice.
4. **Extender** RLS (`0003`) a `message_states`.

> Nota: alterar un `check` con datos existentes requiere `drop constraint` + `add constraint`. Como
> F-001 aún no tiene datos productivos, es seguro. Documentar el orden en el archivo de migración.
