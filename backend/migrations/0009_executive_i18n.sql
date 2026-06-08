-- =============================================================================
-- mentorcomercial · 0009_executive_i18n.sql
-- i18n del dashboard ejecutivo: executive_summary ahora recibe p_lang ('es'|'en')
-- y localiza lo que GENERA el sistema (etiqueta de salud, plantillas de alertas,
-- tipos del timeline). El contenido de datos (títulos de eventos/pendientes,
-- nombres de agentes/grupos, mensajes) queda en su idioma de origen.
--
-- Reemplaza executive_summary(uuid) de 0008. Aplicar DESPUÉS de 0008.
-- =============================================================================

drop function if exists executive_summary(uuid);

create or replace function executive_summary(p_tenant uuid, p_lang text default 'es')
returns jsonb
language sql stable security invoker as $$
  with
  en      as (select p_lang = 'en' as v),
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
        'label', case
          when (select v from en) then (case when score >= 75 then 'Good' when score >= 50 then 'Fair' else 'At risk' end)
          else (case when score >= 75 then 'Buena' when score >= 50 then 'Regular' else 'En riesgo' end) end,
        'tono',  case when score >= 75 then 'ok' when score >= 50 then 'warning' else 'danger' end)
      from (select least(100, greatest(0, round(70 + (activos/total)*30 - criticos*8)))::int as score from s) z
    ),

    'alertas', (
      select coalesce(jsonb_agg(x order by ord), '[]'::jsonb) from (
        select 1 ord, jsonb_build_object(
          'titulo', p.titulo,
          'detalle', case when (select v from en)
            then 'Critical pending · ' || round(extract(epoch from now() - p.created_at)/3600) || 'h unresolved'
            else 'Pendiente crítico · ' || round(extract(epoch from now() - p.created_at)/3600) || ' hs sin resolver' end,
          'tono', 'danger') x
        from pendientes p where p.tenant_id = p_tenant and p.prioridad = 'critico' and p.estado <> 'cerrado'
        union all
        select 2, jsonb_build_object(
          'titulo', (case when (select v from en) then 'Training with no attendees: ' else 'Capacitación sin asistentes: ' end) || c.nombre,
          'detalle', case when (select v from en) then 'Scheduled with no attendance confirmations'
                          else 'Programada sin confirmaciones de asistencia' end,
          'tono', 'warning')
        from capacitaciones c
        where c.tenant_id = p_tenant and c.estado in ('programada','en_curso')
          and not exists (select 1 from capacitacion_asistencia a where a.capacitacion_id = c.id and a.asistio)
        union all
        select 3, jsonb_build_object(
          'titulo', case when (select v from en) then 'Complaints detected' else 'Reclamos detectados' end,
          'detalle', cnt || case when (select v from en) then ' messages with objections/complaints today'
                                 else ' mensajes con objeción/reclamo en el día' end,
          'tono', 'warning')
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
          case e.type
            when 'objecion' then (case when (select v from en) then 'Alert'       else 'Alerta'      end)
            when 'venta'    then (case when (select v from en) then 'Opportunity' else 'Oportunidad' end)
            else                  (case when (select v from en) then 'Event'       else 'Evento'      end) end tipo,
          case e.type when 'objecion' then 'danger' when 'venta' then 'ok' else 'brand' end tono,
          coalesce(e.title, 'Evento comercial') titulo, coalesce(e.description, '') detalle
        from commercial_events e, today_b
        where e.tenant_id = p_tenant
          and e.created_at >= today_b.day_start and e.created_at < today_b.day_end
        union all
        select p.created_at, case when (select v from en) then 'Pending' else 'Pendiente' end,
          'warning', p.titulo, coalesce(p.descripcion, '')
        from pendientes p, today_b
        where p.tenant_id = p_tenant
          and p.created_at >= today_b.day_start and p.created_at < today_b.day_end
      ) u
    ), '[]'::jsonb)
  );
$$;
