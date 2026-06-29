# Arquitectura — Plataforma de Inteligencia Comercial sobre WhatsApp

> Plataforma de inteligencia comercial para una líder de ventas de seguros.
> Captura automática de WhatsApp (grupos + reenvíos privados), memoria comercial
> estructurada y consultable, y un agente personal para la líder.

**Estado:** diseño objetivo (producto completo). El alcance de la primera
presentación es **solo la Fase 0** (ver Roadmap).

---

## 1. Contexto y restricciones

La líder gestiona ~2.000 agentes; su día vive en WhatsApp, sobre todo en **grupos**
(ventas, capacitación, supervisión, coordinación). La WhatsApp Business API oficial
**no soporta grupos**, por lo que la captura se hace con un **bridge no oficial**
sobre un **número IA dedicado** (no el de la líder).

**Restricciones duras:**
- No intervenir el iPhone de la líder ni migrar su número principal.
- No depender de la API oficial de WhatsApp para el número principal.
- Mantener bajo riesgo operativo (riesgo de baneo aislado en número descartable).
- Minimizar cambios en la forma actual de trabajo.
- Diseñar multi-tenant desde el día 1 (escalar a múltiples líderes y miles de agentes).

---

## 2. Arquitectura general

Tres superficies, cada una con un rol distinto:

| Canal | Rol | Quién | Cuándo |
|---|---|---|---|
| **WhatsApp IA** (número dedicado) | Entrada de datos — observador que captura grupos + reenvíos | nadie lo "usa", solo captura | 24/7 automático |
| **Telegram** (bot) | Agente personal — push de alertas, resúmenes, consultas y órdenes en lenguaje natural | solo la líder (luego líderes) | móvil, día a día |
| **Dashboard web** | Análisis profundo — listas, kanban, históricos, métricas | líder / líderes | escritorio |

```
┌──────────────────────────────────────────────────────────────┐
│  iPhone de la líder — WhatsApp Business (INTACTO, no se toca)  │
└──────────────────────────────────────────────────────────────┘
        │ (reenvío manual de 1:1 importantes)
        ▼
┌─────────────────────┐     ┌──────────────────────────────────┐
│  Número IA dedicado  │◀────│  Grupos (ventas, capacitación,   │
│  (observador)        │     │  supervisión, coordinación...)   │
└──────────┬──────────┘     └──────────────────────────────────┘
           │ multi-device
           ▼
┌─────────────────────┐  CAPTURA
│  Bridge (WAHA/Evo)   │  Docker · red privada · sesión cifrada
└──────────┬──────────┘
           │ webhook firmado (1 evento por mensaje)
           ▼
┌─────────────────────┐  INGESTA
│  n8n                 │  upsert contacto/grupo → insert mensaje
│                      │  → descarga media → encola procesamiento
└──────────┬──────────┘
           ▼
┌──────────────┐   ┌────────────────────┐   PROCESAMIENTO IA (async)
│ Postgres     │   │ Storage (S3)       │   ┌──────────────────────┐
│ (Supabase)   │◀─▶│ audio/img/video/pdf│◀─▶│ Transcripción (audio)│
│ + pgvector   │   └────────────────────┘   │ Clasificación        │
└──────┬───────┘                            │ Extracción de eventos│
       │                                     │ Embeddings (RAG)     │
       │                                     └──────────────────────┘
       ▼
┌─────────────────────┐  MEMORIA COMERCIAL
│ eventos · tareas ·   │  estructurado + trazable + buscable
│ oportunidades ·      │
│ clientes · productos │
└──────────┬──────────┘
           ├───────────────────────────┐
           ▼                           ▼
┌─────────────────────┐   ┌─────────────────────────────────┐
│ Telegram (bot)      │   │ Dashboard web (PWA, tema claro) │
│ agente personal de  │   │ Supabase Auth + Realtime +      │
│ la líder: push, NL, │   │ PostgREST                        │
│ acciones            │   │                                  │
└─────────────────────┘   └─────────────────────────────────┘
```

**Stack:** Bridge WAHA/Evolution (Docker) · n8n (orquestación) ·
Supabase (Postgres + pgvector + Storage + Auth + Realtime) · Whisper (transcripción) ·
LLM vía API (clasificación/extracción) · Bot de Telegram · Frontend PWA.

---

## 3. Modelo de datos y diseño de BD

Todas las tablas llevan `tenant_id` (multi-tenant) y RLS por tenant.

### Capa base (captura)

```sql
-- Multi-tenant: una líder = un tenant
create table tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  ia_wa_jid   text,                    -- número IA de este tenant
  created_at  timestamptz default now()
);

-- Personas: agentes, líderes, clientes que escriben
create table contacts (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id),
  wa_jid       text not null,
  phone        text,
  display_name text,
  created_at   timestamptz default now(),
  unique (tenant_id, wa_jid)
);

-- Chats: grupo o 1:1
create table chats (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id),
  wa_chat_id  text not null,           -- ..@g.us para grupos
  type        text not null check (type in ('group','individual')),
  name        text,
  created_at  timestamptz default now(),
  unique (tenant_id, wa_chat_id)
);

create table chat_participants (
  chat_id    uuid references chats(id),
  contact_id uuid references contacts(id),
  role       text,                      -- admin/member
  primary key (chat_id, contact_id)
);

-- Mensajes: INMUTABLE = fuente de verdad
create table messages (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id),
  wa_message_id text not null,          -- idempotencia
  chat_id       uuid references chats(id) not null,
  sender_id     uuid references contacts(id),
  direction     text default 'in' check (direction in ('in','out')),
  type          text not null,          -- text/image/audio/video/document/location
  body          text,                   -- texto o caption
  quoted_msg_id text,
  wa_timestamp  timestamptz not null,   -- hora REAL del mensaje
  raw           jsonb not null,         -- payload COMPLETO del bridge (red de seguridad)
  created_at    timestamptz default now(),
  unique (tenant_id, wa_message_id)
);
create index on messages (chat_id, wa_timestamp desc);
create index on messages using gin (raw);
create index on messages using gin (to_tsvector('spanish', coalesce(body,'')));

-- Media en Storage, no en la BD
create table media (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id),
  message_id   uuid references messages(id),
  mime_type    text,
  storage_path text,
  size_bytes   bigint,
  downloaded   boolean default false
);

-- Estado mutable: separado de messages
create table message_triage (
  message_id   uuid primary key references messages(id),
  tenant_id    uuid not null references tenants(id),
  status       text default 'new' check (status in ('new','seen','actioned','ignored')),
  importance   text,                    -- red/yellow/white
  category     text,                    -- reclamo/pago/pregunta/...
  assigned_to  uuid references contacts(id),
  delivered_tg boolean default false,   -- ¿ya fue a Telegram?
  actioned_at  timestamptz
);
```

### Capa comercial (memoria)

```sql
-- Transcripción de audios (1:1 con un message tipo audio)
create table transcriptions (
  message_id  uuid primary key references messages(id),
  tenant_id   uuid not null references tenants(id),
  text        text,
  language    text default 'es',
  engine      text,
  confidence  numeric,
  created_at  timestamptz default now()
);

-- Clientes finales mencionados
create table clients (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id),
  name        text,
  identifiers jsonb,                    -- poliza, doc, tel...
  created_at  timestamptz default now()
);

-- Productos de seguro mencionados
create table products (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id),
  name        text,
  type        text                      -- vida/auto/hogar/salud...
);

-- Evento comercial: unidad de la memoria comercial
create table commercial_events (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id),
  type        text not null check (type in
              ('oportunidad','renovacion','reclamo','seguimiento',
               'capacitacion','tarea','consulta')),
  status      text default 'open',      -- open/in_progress/done/dismissed
  title       text,
  description text,
  client_id   uuid references clients(id),
  product_id  uuid references products(id),
  importance  text,                     -- red/yellow/white
  confidence  numeric,                  -- confianza de la IA (0-1)
  details     jsonb,
  created_by  text default 'ai',        -- ai / human
  created_at  timestamptz default now()
);

-- TRAZABILIDAD: evento ←→ mensajes que lo originaron (N:M)
create table event_sources (
  event_id    uuid references commercial_events(id),
  message_id  uuid references messages(id),
  primary key (event_id, message_id)
);

-- Tareas (ciclo de vida propio)
create table tasks (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id),
  description   text not null,
  due_date      date,
  status        text default 'pending', -- pending/done/cancelled
  assigned_to   uuid references contacts(id),
  source_event  uuid references commercial_events(id),
  created_at    timestamptz default now()
);

-- Menciones: qué mensaje nombró a qué cliente/producto
create table message_entities (
  message_id  uuid references messages(id),
  tenant_id   uuid not null references tenants(id),
  client_id   uuid references clients(id),
  product_id  uuid references products(id),
  span        text                      -- texto exacto detectado
);

-- Embeddings para RAG / búsqueda semántica (pgvector)
create table message_embeddings (
  message_id  uuid primary key references messages(id),
  tenant_id   uuid not null references tenants(id),
  embedding   vector(1536)
);
create index on message_embeddings using ivfflat (embedding vector_cosine_ops);
```

**Principios del modelo:**
- `raw jsonb` en `messages` = guardás todo crudo aunque el esquema evolucione.
- `messages` inmutable = fuente de verdad; lo que la IA infiere vive aparte con `confidence` → re-procesable sin corromper el original.
- `commercial_events` + `event_sources` (N:M) + `message_entities` = **trazabilidad completa** del mensaje original al evento generado y viceversa.
- `tenant_id` + RLS en todo = multi-tenant sin retrofit.

---

## 4. Flujo de captura

```
1. Mensaje en grupo / reenvío 1:1 → número IA
2. Bridge emite webhook firmado → n8n
3. n8n valida firma → upsert contact + chat (+ chat_participants si grupo)
4. insert message (on conflict (tenant_id, wa_message_id) do nothing)  ← idempotente
5. ¿media? → descarga del bridge → sube a Storage → insert media
6. insert message_triage(status='new')
7. encola job de procesamiento IA
```

Pasos 1–6 = "guardar TODO". Nada se filtra en la captura.

---

## 5. Flujo de procesamiento IA (asíncrono)

```
Worker toma job de la cola:
  a. audio → Whisper → transcriptions (el texto pasa a ser el "contenido")
  b. clasificación → message_triage.category + importance
  c. extracción → clients/products + message_entities
  d. ¿genera evento? → commercial_events + event_sources
                       (con confidence; bajo umbral → revisión humana)
  e. embedding → message_embeddings (RAG)

Jobs programados (n8n cron):
  - Resúmenes diario / semanal / mensual
  - Detección de pendientes sin acción → alerta a Telegram
```

La **consulta en lenguaje natural** = RAG sobre `message_embeddings` + text-to-SQL
sobre las tablas. Es la pieza que se construye con LangGraph (Fase 2).

---

## 6. APIs

| API | Tipo | Uso |
|---|---|---|
| `POST /ingest/webhook` | interna | bridge → n8n (firmada) |
| PostgREST (Supabase) | REST | dashboard lee messages/events/tasks/clients + RLS |
| Supabase Realtime | WS | bandeja en vivo |
| Supabase Auth | — | login de la líder |
| `POST /ai/ask` | servicio | consulta NL → respuesta (Fase 2: LangGraph) |
| `POST /ai/summarize` | servicio/cron | resúmenes diario/semanal/mensual |
| Telegram Bot API | webhook | push de alertas/resúmenes + comandos/consultas de la líder |
| Storage signed URLs | REST | servir media en el dashboard |

---

## 7. Telegram — agente personal de la líder

Telegram es la **capa de interacción/control**, distinta de la captura (WhatsApp IA)
y del análisis profundo (dashboard).

- **Push:** alertas (🔴 reclamo, oportunidad nueva), resumen diario "¿qué pasó hoy?".
- **Consulta NL:** la líder escribe *"¿qué clientes requieren seguimiento?"*,
  *"¿qué oportunidades aparecieron esta semana?"* → el bot responde desde la memoria.
- **Acciones:** botones inline para marcar resuelto, asignar, crear tarea.
- **Exclusivo del equipo de gestión** (la líder, luego líderes). Los agentes NO usan
  Telegram — siguen en WhatsApp.

Por qué Telegram y no una app propia: bot oficial gratis, push nativo, botones,
multi-dispositivo, adopción trivial (pocos usuarios de confianza).

---

## 8. Dashboard web (reusa el prototipo de tema claro)

- **Hoy** → "¿Qué pasó hoy?": resumen + eventos del día + alertas.
- **Bandeja priorizada** → triage (🔴/🟡/⚪), con link al hilo original.
- **Oportunidades / Renovaciones / Reclamos / Seguimientos** → desde `commercial_events`.
- **Tareas pendientes** → `tasks`.
- **Clientes** → quién requiere seguimiento.
- **Buscador** → full-text + (Fase 2) lenguaje natural.
- **Resúmenes** → diario/semanal/mensual.
- **Agentes más activos** → analytics sobre `messages`.

---

## 9. Estrategia de almacenamiento

- **Postgres (Supabase):** estructurado + `raw jsonb`.
- **Storage (S3 / Supabase Storage):** media, con **TTL por tipo** — video se purga
  a 30–90 días; audio se conserva mientras exista la transcripción; texto/metadata
  indefinido.
- **pgvector:** embeddings para RAG.
- **Particionado de `messages`** por mes/tenant cuando crezca.

---

## 10. Estrategia de escalabilidad

- **Multi-tenant** (`tenant_id` + RLS) desde el día 1.
- **Un bridge por número IA = uno por líder.** El bridge no es compartible; cada líder
  suma un contenedor. A escala → orquestación (Kubernetes/colas) de N bridges.
- **Cola entre captura y procesamiento** → absorbe picos sin perder mensajes.
- **Workers de IA horizontales** (transcripción/LLM es lo caro de escalar).
- **Caching de resúmenes** y vistas materializadas para analytics.

---

## 11. Riesgos técnicos y mitigaciones

| Riesgo | Sev | Mitigación |
|---|---|---|
| Baneo del número IA | 🔴 | Número dedicado, rol observador (casi no envía), warm-up, límites |
| Sesión del bridge comprometida | 🔴 | Host aislado, red privada, sesión cifrada, secretos en vault |
| Privacidad de terceros (datos de clientes) | 🔴 | Consentimiento/aviso, RLS, región de datos, retención mínima |
| Desconexión del bridge = ceguera | 🟡 | Health-check + reconexión + alerta a la líder |
| Costo IA a escala | 🟡 | Batch, procesar selectivamente, modelos chicos para clasificar |
| Falsos positivos en eventos | 🟡 | `confidence` + revisión humana bajo umbral |
| Reenvío manual pierde autoría | 🟡 | Metadata degradada / la líder agrega contexto |
| Escala de N bridges | 🟡 | Orquestación a futuro; MVP es 1 |
| Visibilidad del número IA ante terceros | 🟡 | Perfil claro ("Asistente de [Líder]"), base legal definida |

---

## 12. Roadmap MVP → Producción

| Fase | Alcance | Cuándo |
|---|---|---|
| **F0 — DEMO** | Captura real de 1 grupo → BD · transcripción de audios · clasificación simple · dashboard "¿Qué pasó hoy?" + buscador. Corre sobre datos reales ya capturados (híbrido). | **2 semanas — solo esto** |
| **F1 — MVP 1 líder** | Todos los grupos · eventos comerciales + trazabilidad · resúmenes diario/semanal · reenvío 1:1 · tareas/oportunidades · Telegram básico (alertas + resumen) | post-demo |
| **F2 — Producción** | Consultas en lenguaje natural (RAG/LangGraph) en Telegram y dashboard · multi-tenant real · hardening · observabilidad · escalado de bridges | luego |
| **F3 — Escala** | Múltiples líderes · miles de agentes · orquestación de bridges · analytics avanzado | luego |

---

## Decisiones firmes (a la fecha)

- Captura vía **bridge no oficial** (WAHA/Evolution) sobre **número IA dedicado**;
  no se toca el número/iPhone de la líder.
- Orquestación con **n8n** (LangGraph pospuesto a Fase 2 para el motor de IA).
- BD y backend sobre **Supabase** (Postgres + pgvector + Storage + Auth + Realtime).
- **Telegram** como agente personal de la líder (capa de control), separado de la
  captura (WhatsApp) y del análisis (dashboard).
- Demo de presentación = **enfoque híbrido**: datos reales capturados antes, demo
  corre sobre lo ya guardado.
