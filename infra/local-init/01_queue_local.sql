-- Cola fallback (sin pgmq) para local. El backend con QUEUE_BACKEND=table la usa.
create table if not exists processing_jobs (
  id          bigserial primary key,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  message_id  uuid not null references messages(id) on delete cascade,
  status      text not null default 'queued' check (status in ('queued','processing','done','failed')),
  attempts    int  not null default 0,
  last_error  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_jobs_queued on processing_jobs (status, created_at)
  where status = 'queued';
