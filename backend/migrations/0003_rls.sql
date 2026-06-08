-- =============================================================================
-- mentorcomercial · 0003_rls.sql
-- Row Level Security multi-tenant. Aislamiento por tenant_id.
-- Patrón KB: architect-kb/patterns/supabase-rls-policy.md
-- Regla KB: el SERVICE_ROLE_KEY (backend) bypassa RLS; el frontend usa anon/JWT.
--           ver architect-kb/lessons/supabase-service-role-key-nunca-en-frontend.md
-- =============================================================================

-- El backend (FastAPI con service_role) escribe; el frontend lee filtrado por tenant.
-- El tenant del usuario autenticado se resuelve desde un claim del JWT: app_metadata.tenant_id

create or replace function current_tenant_id() returns uuid
language sql stable as $$
  select nullif(
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id',
    ''
  )::uuid;
$$;

-- Habilitar RLS en todas las tablas con datos del tenant
do $$
declare t text;
begin
  foreach t in array array[
    'contacts','chats','chat_participants','messages','media','message_triage',
    'transcriptions','clients','products','commercial_events','event_sources',
    'tasks','message_entities','message_embeddings'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end$$;

-- Política de lectura por tenant (SELECT) para las tablas con tenant_id directo
do $$
declare t text;
begin
  foreach t in array array[
    'contacts','chats','messages','media','message_triage','transcriptions',
    'clients','products','commercial_events','tasks','message_entities','message_embeddings'
  ] loop
    execute format($f$
      create policy %1$s_tenant_read on %1$I
        for select using (tenant_id = current_tenant_id());
    $f$, t);
  end loop;
end$$;

-- chat_participants y event_sources no tienen tenant_id directo → vía join
create policy chat_participants_tenant_read on chat_participants
  for select using (exists (
    select 1 from chats c where c.id = chat_participants.chat_id
      and c.tenant_id = current_tenant_id()));

create policy event_sources_tenant_read on event_sources
  for select using (exists (
    select 1 from commercial_events e where e.id = event_sources.event_id
      and e.tenant_id = current_tenant_id()));

-- NOTA: no se crean políticas de INSERT/UPDATE/DELETE para el rol anon.
-- Toda escritura pasa por el backend con service_role (bypassa RLS).
