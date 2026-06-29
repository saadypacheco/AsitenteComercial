-- =============================================================================
-- 0026_onboarding_contenido.sql
-- Canal WhatsApp → Onboarding: Cecilia envía desde un grupo dedicado y el
-- sistema clasifica automáticamente el contenido a la etapa correcta.
-- Aplica DESPUÉS de 0025. Idempotente.
-- =============================================================================

-- Campo en tenants para designar el grupo de WhatsApp como canal de onboarding
alter table tenants
  add column if not exists onboarding_wa_chat_id text; -- wa_chat_id del grupo (…@g.us)

-- Tabla principal: cada pieza de contenido publicada desde WhatsApp
create table if not exists onboarding_contenido (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  etapa_id      uuid not null references capacitacion_etapas(id) on delete cascade,
  tipo          text not null check (tipo in ('text','audio','video','image','document')),
  cuerpo        text,                  -- texto o transcripción del audio
  media_url     text,                  -- URL original de WAHA (descarga temporal)
  storage_path  text,                  -- ruta en Supabase Storage (post-descarga)
  fuente        text not null default 'whatsapp',
  mensaje_id    uuid references messages(id) on delete set null,
  publicado     boolean not null default true,
  -- Clasificación IA
  ia_confianza  numeric,               -- 0.0–1.0, confianza del clasificador
  ia_razon      text,                  -- explicación del clasificador
  created_at    timestamptz not null default now()
);

create index if not exists idx_onboarding_contenido_etapa
  on onboarding_contenido (etapa_id, publicado, created_at desc);

create index if not exists idx_onboarding_contenido_tenant
  on onboarding_contenido (tenant_id, created_at desc);

alter table onboarding_contenido enable row level security;

-- RLS: líderes del tenant + agentes via función helper (misma que otras tablas)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'onboarding_contenido'
    and policyname = 'tenant_onboarding_contenido'
  ) then
    execute 'create policy "tenant_onboarding_contenido"
      on onboarding_contenido
      using (tenant_id = current_setting(''app.tenant_id'', true)::uuid)';
  end if;
end $$;
