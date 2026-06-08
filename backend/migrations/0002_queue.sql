-- =============================================================================
-- mentorcomercial · 0002_queue.sql
-- Cola DURABLE entre captura y procesamiento (robustez: no perder mensajes).
-- pgmq corre sobre el mismo Postgres → cero infra extra.
-- Si pgmq no está disponible, ver el fallback con tabla simple más abajo.
-- =============================================================================

-- Opción A (recomendada): pgmq (https://github.com/tembo-io/pgmq)
-- Requiere la extensión instalada en la imagen de Postgres.
create extension if not exists pgmq cascade;

-- Cola de procesamiento IA: cada mensaje capturado encola un job aquí.
-- El worker (backend/app/services/worker.py) la consume.
select pgmq.create('ai_processing');

-- -----------------------------------------------------------------------------
-- Fallback (si la imagen de Postgres NO trae pgmq): tabla de jobs simple.
-- Descomentar y usar SELECT ... FOR UPDATE SKIP LOCKED en el worker.
-- -----------------------------------------------------------------------------
-- create table if not exists processing_jobs (
--   id          bigserial primary key,
--   tenant_id   uuid not null references tenants(id) on delete cascade,
--   message_id  uuid not null references messages(id) on delete cascade,
--   status      text not null default 'queued' check (status in ('queued','processing','done','failed')),
--   attempts    int  not null default 0,
--   last_error  text,
--   created_at  timestamptz not null default now(),
--   updated_at  timestamptz not null default now()
-- );
-- create index if not exists idx_jobs_queued on processing_jobs (status, created_at)
--   where status = 'queued';
