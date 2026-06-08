-- =============================================================================
-- mentorcomercial · 0001_init.sql
-- Esquema base: captura WhatsApp + memoria comercial (multi-tenant)
-- Stack: Supabase self-hosted (Postgres 15) + pgvector
-- Ref: docs/ARQUITECTURA.md · architect-kb/decisions/2026-06-07-stack-mentorcomercial.md
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- -----------------------------------------------------------------------------
-- Multi-tenant: una líder = un tenant (escala a N líderes)
-- -----------------------------------------------------------------------------
create table if not exists tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  ia_wa_jid   text,                       -- número IA (observador) de este tenant
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Personas: agentes, líderes, clientes que escriben en los grupos
-- -----------------------------------------------------------------------------
create table if not exists contacts (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  wa_jid        text not null,
  phone         text,
  display_name  text,
  created_at    timestamptz not null default now(),
  unique (tenant_id, wa_jid)
);

-- -----------------------------------------------------------------------------
-- Chats: grupo o 1:1
-- -----------------------------------------------------------------------------
create table if not exists chats (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  wa_chat_id  text not null,              -- ..@g.us para grupos
  type        text not null check (type in ('group','individual')),
  name        text,
  created_at  timestamptz not null default now(),
  unique (tenant_id, wa_chat_id)
);

create table if not exists chat_participants (
  chat_id    uuid not null references chats(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  role       text,                        -- admin/member
  primary key (chat_id, contact_id)
);

-- -----------------------------------------------------------------------------
-- Mensajes: INMUTABLE = fuente de verdad. Nada se filtra en la captura.
-- -----------------------------------------------------------------------------
create table if not exists messages (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  wa_message_id text not null,            -- idempotencia (no duplica en reintentos)
  chat_id       uuid not null references chats(id) on delete cascade,
  sender_id     uuid references contacts(id),
  direction     text not null default 'in' check (direction in ('in','out')),
  type          text not null,            -- text/image/audio/video/document/location
  body          text,                     -- texto o caption
  quoted_msg_id text,
  wa_timestamp  timestamptz not null,     -- hora REAL del mensaje
  raw           jsonb not null,           -- payload COMPLETO del bridge (red de seguridad)
  created_at    timestamptz not null default now(),
  unique (tenant_id, wa_message_id)
);
create index if not exists idx_messages_chat_ts on messages (chat_id, wa_timestamp desc);
create index if not exists idx_messages_raw_gin on messages using gin (raw);
create index if not exists idx_messages_fts on messages
  using gin (to_tsvector('spanish', coalesce(body,'')));

-- -----------------------------------------------------------------------------
-- Media: archivos en Storage, acá solo metadata
-- -----------------------------------------------------------------------------
create table if not exists media (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  message_id    uuid not null references messages(id) on delete cascade,
  mime_type     text,
  storage_path  text,
  size_bytes    bigint,
  downloaded    boolean not null default false
);

-- -----------------------------------------------------------------------------
-- Triage: estado MUTABLE, separado de messages para no tocar la verdad
-- -----------------------------------------------------------------------------
create table if not exists message_triage (
  message_id   uuid primary key references messages(id) on delete cascade,
  tenant_id    uuid not null references tenants(id) on delete cascade,
  status       text not null default 'new' check (status in ('new','seen','actioned','ignored')),
  importance   text,                      -- red/yellow/white
  category     text,                      -- reclamo/pago/pregunta/...
  assigned_to  uuid references contacts(id),
  delivered_tg boolean not null default false,  -- ¿ya fue a Telegram? (F1)
  actioned_at  timestamptz
);

-- -----------------------------------------------------------------------------
-- Transcripción de audios (1:1 con un message tipo audio) · multi-idioma
-- -----------------------------------------------------------------------------
create table if not exists transcriptions (
  message_id  uuid primary key references messages(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  text        text,
  language    text,                       -- detectado por Whisper (multi-idioma)
  engine      text,                       -- faster-whisper / whisper.cpp
  confidence  numeric,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Clientes finales y productos de seguro mencionados
-- -----------------------------------------------------------------------------
create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text,
  identifiers jsonb,                       -- poliza, doc, tel...
  created_at  timestamptz not null default now()
);

create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text,
  type        text                         -- vida/auto/hogar/salud...
);

-- -----------------------------------------------------------------------------
-- Evento comercial: unidad de la memoria comercial
-- -----------------------------------------------------------------------------
create table if not exists commercial_events (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  type        text not null check (type in
              ('oportunidad','renovacion','reclamo','seguimiento',
               'capacitacion','tarea','consulta')),
  status      text not null default 'open',  -- open/in_progress/done/dismissed
  title       text,
  description text,
  client_id   uuid references clients(id),
  product_id  uuid references products(id),
  importance  text,                          -- red/yellow/white
  confidence  numeric,                        -- confianza de la IA (0-1)
  details     jsonb,
  created_by  text not null default 'ai',     -- ai / human
  created_at  timestamptz not null default now()
);

-- TRAZABILIDAD: evento <-> mensajes que lo originaron (N:M)
create table if not exists event_sources (
  event_id    uuid not null references commercial_events(id) on delete cascade,
  message_id  uuid not null references messages(id) on delete cascade,
  primary key (event_id, message_id)
);

-- Tareas (ciclo de vida propio)
create table if not exists tasks (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  description   text not null,
  due_date      date,
  status        text not null default 'pending', -- pending/done/cancelled
  assigned_to   uuid references contacts(id),
  source_event  uuid references commercial_events(id),
  created_at    timestamptz not null default now()
);

-- Menciones: qué mensaje nombró a qué cliente/producto (trazabilidad fina)
create table if not exists message_entities (
  message_id  uuid not null references messages(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  client_id   uuid references clients(id),
  product_id  uuid references products(id),
  span        text                         -- texto exacto detectado
);

-- Embeddings para RAG / búsqueda semántica (pgvector) · F2
create table if not exists message_embeddings (
  message_id  uuid primary key references messages(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  embedding   vector(1536)
);
create index if not exists idx_message_embeddings_ivf on message_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
