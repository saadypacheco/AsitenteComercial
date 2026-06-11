-- =============================================================================
-- mentorcomercial · 0018_clientes.sql
-- Cartera de clientes (Producto ②, preocupación #3): no perder oportunidades ni
-- descuidar la cartera. Cliente final con su producto, vencimiento (renovación),
-- último contacto y agente responsable → alimenta renovaciones próximas, clientes
-- sin seguimiento y cross-sell (vida → retiro). Aplicar DESPUÉS de 0017. Idempotente.
-- =============================================================================

create table if not exists clientes (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  nombre         text not null,
  telefono       text,
  email          text,
  agente_id      uuid references agentes(id),       -- responsable
  producto       text,                              -- vida | retiro | auto | salud | hogar
  estado         text not null default 'activo'
                   check (estado in ('activo','prospecto','inactivo')),
  valor_poliza   numeric default 0,                 -- USD anual
  vencimiento    date,                              -- renovación
  ultimo_contacto date,
  vip            boolean not null default false,
  notas          text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_clientes_tenant on clientes (tenant_id);
create index if not exists idx_clientes_agente on clientes (agente_id);
alter table clientes enable row level security;
