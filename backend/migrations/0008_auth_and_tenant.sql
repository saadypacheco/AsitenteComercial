-- =============================================================================
-- mentorcomercial · 0008_auth_and_tenant.sql
-- FR-009: login con sesión + AISLAMIENTO POR TENANT real.
--  (a) tabla app_users (líder/staff con su tenant_id).
--  (b) las funciones de lectura del dashboard pasan a recibir p_tenant y filtran
--      por tenant → el dashboard ya no ve "todo", ve lo de su líder.
-- El backend toma el tenant del JWT (no del cliente) y lo pasa a estas funciones.
--
-- Aplicar DESPUÉS de 0001–0007. Idempotente.
-- =============================================================================

-- (a) Usuarios de la app -------------------------------------------------------
create table if not exists app_users (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  email         text not null unique,
  password_hash text not null,                 -- PBKDF2-SHA256 (ver core/auth.py)
  nombre        text,
  rol           text not null default 'lider', -- lider / staff
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);
alter table app_users enable row level security;
-- (sin política para anon: el acceso pasa por el backend, no por PostgREST)

-- (b) Funciones tenant-aware. Se reemplazan las versiones sin tenant de 0005/0007.
drop function if exists daily_summary();
drop function if exists daily_chat_detail(uuid);
drop function if exists search_everything(text, text);
drop function if exists executive_summary();

-- ── Resumen del día (US2) ────────────────────────────────────────────────────
create or replace function daily_summary(p_tenant uuid)
returns jsonb
language sql stable security invoker as $$
  with today_msgs as (
    select m.* from messages m
    where m.tenant_id = p_tenant
      and m.wa_timestamp >= (select day_start from business_day_bounds())
      and m.wa_timestamp <  (select day_end   from business_day_bounds())
  )
  select jsonb_build_object(
    'fecha_et', to_char(
      ((select day_start from business_day_bounds()) at time zone 'America/New_York'),
      'YYYY-MM-DD'),
    'total_mensajes', (select count(*) from today_msgs),
    'vacio', (select count(*) from today_msgs) = 0,
    'por_chat', coalesce((
      select jsonb_agg(jsonb_build_object(
        'chat_id', c.id, 'nombre', c.name, 'tipo', c.type,
        'mensajes', t.cnt, 'ultimo', t.ultimo) order by t.cnt desc)
      from (
        select chat_id, count(*) cnt, max(wa_timestamp) ultimo
        from today_msgs group by chat_id
      ) t join chats c on c.id = t.chat_id
    ), '[]'::jsonb),
    'ultimos', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object(
          'message_id', m.id, 'chat', c.name, 'remitente', ct.display_name,
          'tipo', m.type, 'preview', left(coalesce(m.body, ''), 120),
          'wa_timestamp', m.wa_timestamp) x
        from today_msgs m
          join chats c on c.id = m.chat_id
          left join contacts ct on ct.id = m.sender_id
        order by m.wa_timestamp desc
        limit 10
      ) s
    ), '[]'::jsonb)
  );
$$;

-- ── Detalle de un chat hoy ───────────────────────────────────────────────────
create or replace function daily_chat_detail(p_chat_id uuid, p_tenant uuid)
returns jsonb
language sql stable security invoker as $$
  select coalesce(jsonb_agg(x order by ts), '[]'::jsonb)
  from (
    select
      m.wa_timestamp as ts,
      jsonb_build_object(
        'message_id', m.id, 'remitente', ct.display_name, 'tipo', m.type,
        'body', m.body, 'wa_timestamp', m.wa_timestamp,
        'transcripcion', case when tr.message_id is not null
          then jsonb_build_object('texto', tr.text, 'idioma', tr.language,
                                  'audio_message_id', tr.message_id) else null end,
        'media', case when md.id is not null
          then jsonb_build_object('tipo', m.type, 'storage_path', md.storage_path) else null end
      ) as x
    from messages m
      left join contacts ct on ct.id = m.sender_id
      left join transcriptions tr on tr.message_id = m.id
      left join media md on md.message_id = m.id
    where m.chat_id = p_chat_id and m.tenant_id = p_tenant
      and m.wa_timestamp >= (select day_start from business_day_bounds())
      and m.wa_timestamp <  (select day_end   from business_day_bounds())
  ) s;
$$;

-- ── Buscador global ──────────────────────────────────────────────────────────
create or replace function search_everything(p_q text, p_tipo text, p_tenant uuid)
returns jsonb
language sql stable security invoker as $$
  select coalesce(jsonb_agg(x order by ts desc), '[]'::jsonb) from (
    select m.wa_timestamp ts, jsonb_build_object(
      'tipo', m.type, 'texto', coalesce(m.body, tr.text),
      'chat', c.name, 'remitente', ct.display_name, 'message_id', m.id) x
    from messages m
      join chats c on c.id = m.chat_id
      left join contacts ct on ct.id = m.sender_id
      left join transcriptions tr on tr.message_id = m.id
    where m.tenant_id = p_tenant and p_q <> '' and (
        m.body ilike '%' || p_q || '%' or tr.text ilike '%' || p_q || '%')
      and (p_tipo = 'mensajes'
           or (p_tipo = 'audios' and m.type = 'audio')
           or (p_tipo = 'imagenes' and m.type = 'image'))
    limit 30
  ) s;
$$;

-- ── Dashboard ejecutivo (todo filtrado por p_tenant) ─────────────────────────
create or replace function executive_summary(p_tenant uuid)
returns jsonb
language sql stable security invoker as $$
  with
  today_b as (select day_start, day_end from business_day_bounds()),
  yest_b  as (select day_start, day_end from business_day_bounds(now() - interval '1 day')),
  win7    as (select now() - interval '7 days' as since),
  elapsed as (select now() - (select day_start from today_b) as e),

  hoy_msgs  as (select count(*) c from messages, today_b
                where tenant_id = p_tenant
                  and wa_timestamp >= today_b.day_start and wa_timestamp < today_b.day_end),
  ayer_msgs as (select count(*) c from messages, yest_b
                where tenant_id = p_tenant
                  and wa_timestamp >= yest_b.day_start and wa_timestamp < yest_b.day_end),
  ayer_same as (select count(*) c from messages, yest_b, elapsed
                where tenant_id = p_tenant
                  and wa_timestamp >= yest_b.day_start
                  and wa_timestamp < yest_b.day_start + elapsed.e),

  inter as (
    select a.id, count(m.id) c
    from agentes a
      left join messages m on m.sender_id = a.contact_id and m.tenant_id = p_tenant
        and m.wa_timestamp >= (select since from win7)
    where a.tenant_id = p_tenant and a.estado <> 'baja'
    group by a.id
  ),
  inter_total as (select greatest(sum(c), 1) s from inter),
  cerrados as (
    select agente_id, count(*) c from pendientes
    where tenant_id = p_tenant and estado = 'cerrado' group by agente_id
  )

  select jsonb_build_object(
    'fecha_et', to_char((select day_start from today_b) at time zone 'America/New_York', 'YYYY-MM-DD'),

    'pulso', jsonb_build_object(
      'mensajes_hoy', (select c from hoy_msgs),
      'mensajes_ayer', (select c from ayer_msgs),
      'delta_pct', case when (select c from ayer_same) = 0 then null
                   else round(((select c from hoy_msgs) - (select c from ayer_same))::numeric
                              / (select c from ayer_same) * 100) end,
      'grupos_activos', (select count(distinct chat_id) from messages, today_b
                         where tenant_id = p_tenant
                           and wa_timestamp >= today_b.day_start and wa_timestamp < today_b.day_end),
      'serie_7d', coalesce((
        select jsonb_agg(d.cnt order by d.dia)
        from (
          select gs::date dia,
                 (select count(*) from messages m
                  where m.tenant_id = p_tenant
                    and m.wa_timestamp >= gs and m.wa_timestamp < gs + interval '1 day') cnt
          from generate_series(
            (date_trunc('day', now()) - interval '6 days'), date_trunc('day', now()), interval '1 day') gs
        ) d
      ), '[]'::jsonb)
    ),

    'salud', (
      with s as (
        select
          (select count(*) from agentes where tenant_id = p_tenant and estado = 'activo')::numeric as activos,
          greatest((select count(*) from agentes where tenant_id = p_tenant), 1)::numeric          as total,
          (select count(*) from pendientes where tenant_id = p_tenant
             and prioridad = 'critico' and estado <> 'cerrado')::numeric as criticos
      )
      select jsonb_build_object(
        'score', score,
        'label', case when score >= 75 then 'Buena' when score >= 50 then 'Regular' else 'En riesgo' end,
        'tono',  case when score >= 75 then 'ok' when score >= 50 then 'warning' else 'danger' end)
      from (select least(100, greatest(0, round(70 + (activos/total)*30 - criticos*8)))::int as score from s) z
    ),

    'alertas', (
      select coalesce(jsonb_agg(x order by ord), '[]'::jsonb) from (
        select 1 ord, jsonb_build_object(
          'titulo', p.titulo,
          'detalle', 'Pendiente crítico · ' ||
            round(extract(epoch from now() - p.created_at)/3600) || ' hs sin resolver',
          'tono', 'danger') x
        from pendientes p where p.tenant_id = p_tenant and p.prioridad = 'critico' and p.estado <> 'cerrado'
        union all
        select 2, jsonb_build_object(
          'titulo', 'Capacitación sin asistentes: ' || c.nombre,
          'detalle', 'Programada sin confirmaciones de asistencia', 'tono', 'warning')
        from capacitaciones c
        where c.tenant_id = p_tenant and c.estado in ('programada','en_curso')
          and not exists (select 1 from capacitacion_asistencia a
                          where a.capacitacion_id = c.id and a.asistio)
        union all
        select 3, jsonb_build_object(
          'titulo', 'Reclamos detectados',
          'detalle', cnt || ' mensajes con objeción/reclamo en el día', 'tono', 'warning')
        from (select count(*) cnt from commercial_events
              where tenant_id = p_tenant and type = 'objecion' and status <> 'dismissed') r
        where r.cnt > 0
      ) s
    ),

    'oportunidades', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'titulo', coalesce(title, 'Oportunidad'), 'detalle', coalesce(description, ''),
        'nivel', coalesce(importance, 'medio')) order by created_at desc), '[]'::jsonb)
      from commercial_events
      where tenant_id = p_tenant and type in ('venta','consulta','seguimiento') and status = 'open'
    ),

    'pendientes', jsonb_build_object(
      'total', (select count(*) from pendientes where tenant_id = p_tenant and estado <> 'cerrado'),
      'criticos', (select count(*) from pendientes where tenant_id = p_tenant
                   and prioridad = 'critico' and estado <> 'cerrado'),
      'en_proceso', (select count(*) from pendientes where tenant_id = p_tenant and estado = 'en_proceso'),
      'pendientes', (select count(*) from pendientes where tenant_id = p_tenant
                     and estado = 'pendiente' and prioridad <> 'critico')
    ),

    'ranking', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nombre', trim(a.nombre || ' ' || coalesce(a.apellido, '')),
        'interacciones', i.c,
        'pendientes_cerrados', coalesce(cc.c, 0),
        'participacion', round(i.c::numeric / (select s from inter_total) * 100)
      ) order by i.c desc)
      from agentes a
        join inter i on i.id = a.id
        left join cerrados cc on cc.agente_id = a.id
      where a.tenant_id = p_tenant and a.estado <> 'baja'
    ), '[]'::jsonb),

    'grupos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nombre', c.name, 'tipo', c.type, 'mensajes_7d', g.cnt,
        'estado', case when g.cnt = 0 then 'inactivo' when g.cnt >= 10 then 'activo' else 'atencion' end,
        'actividad', case when g.cnt = 0 then 'baja' when g.cnt >= 10 then 'alta' else 'media' end
      ) order by g.cnt desc)
      from chats c
        join (
          select ch.id, count(m.id) cnt
          from chats ch
            left join messages m on m.chat_id = ch.id and m.tenant_id = p_tenant
              and m.wa_timestamp >= (select since from win7)
          where ch.tenant_id = p_tenant
          group by ch.id
        ) g on g.id = c.id
      where c.tenant_id = p_tenant
    ), '[]'::jsonb),

    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ts', ts, 'tipo', tipo, 'tono', tono, 'titulo', titulo, 'detalle', detalle) order by ts desc)
      from (
        select e.created_at ts,
          case e.type when 'objecion' then 'Alerta' when 'venta' then 'Oportunidad' else 'Evento' end tipo,
          case e.type when 'objecion' then 'danger' when 'venta' then 'ok' else 'brand' end tono,
          coalesce(e.title, 'Evento comercial') titulo, coalesce(e.description, '') detalle
        from commercial_events e, today_b
        where e.tenant_id = p_tenant
          and e.created_at >= today_b.day_start and e.created_at < today_b.day_end
        union all
        select p.created_at, 'Pendiente', 'warning', p.titulo, coalesce(p.descripcion, '')
        from pendientes p, today_b
        where p.tenant_id = p_tenant
          and p.created_at >= today_b.day_start and p.created_at < today_b.day_end
      ) u
    ), '[]'::jsonb)
  );
$$;
