-- =============================================================================
-- mentorcomercial · 0007_executive.sql
-- Función de lectura del DASHBOARD EJECUTIVO "¡Hola Cecilia!" (Producto ②).
-- Agrega en UNA llamada todo lo que pinta la pantalla: pulso vs ayer, salud del
-- equipo, alertas críticas, oportunidades, pendientes, ranking de agentes,
-- actividad de grupos, timeline y serie de actividad. Todo con datos REALES.
--
-- SECURITY INVOKER → respeta RLS. Ventana de "hoy" en zona del negocio (ET),
-- reusa business_day_bounds() de 0005. Depende de 0006 (agentes/pendientes/capac.).
-- + Función search_everything() para el buscador con chips (FR-021).
-- =============================================================================

create or replace function executive_summary()
returns jsonb
language sql stable security invoker as $$
  with
  -- Ventanas de tiempo --------------------------------------------------------
  today_b as (select day_start, day_end from business_day_bounds()),
  yest_b  as (select day_start, day_end from business_day_bounds(now() - interval '1 day')),
  win7    as (select now() - interval '7 days' as since),
  -- Fracción transcurrida del día de hoy → comparación JUSTA contra ayer
  -- (hoy es un día parcial; comparar contra el día completo de ayer engaña).
  elapsed as (select now() - (select day_start from today_b) as e),

  -- Volumen ------------------------------------------------------------------
  hoy_msgs  as (select count(*) c from messages, today_b
                where wa_timestamp >= today_b.day_start and wa_timestamp < today_b.day_end),
  ayer_msgs as (select count(*) c from messages, yest_b
                where wa_timestamp >= yest_b.day_start and wa_timestamp < yest_b.day_end),
  -- Ayer, pero solo hasta la misma hora transcurrida que llevamos hoy.
  ayer_same as (select count(*) c from messages, yest_b, elapsed
                where wa_timestamp >= yest_b.day_start
                  and wa_timestamp < yest_b.day_start + elapsed.e),

  -- Interacciones por agente (7d) — join captura↔gestión por contact_id -------
  inter as (
    select a.id, count(m.id) c
    from agentes a
      left join messages m on m.sender_id = a.contact_id
        and m.wa_timestamp >= (select since from win7)
    where a.estado <> 'baja'
    group by a.id
  ),
  inter_total as (select greatest(sum(c), 1) s from inter),

  -- Pendientes cerrados por agente ------------------------------------------
  cerrados as (
    select agente_id, count(*) c from pendientes
    where estado = 'cerrado' group by agente_id
  )

  select jsonb_build_object(
    'fecha_et', to_char((select day_start from today_b) at time zone 'America/New_York', 'YYYY-MM-DD'),

    -- ── Pulso del día (vs ayer) ──────────────────────────────────────────
    'pulso', jsonb_build_object(
      'mensajes_hoy', (select c from hoy_msgs),
      'mensajes_ayer', (select c from ayer_msgs),
      -- delta = hoy vs MISMO horario de ayer (comparable), no vs día completo.
      'delta_pct', case when (select c from ayer_same) = 0 then null
                   else round(((select c from hoy_msgs) - (select c from ayer_same))::numeric
                              / (select c from ayer_same) * 100) end,
      'grupos_activos', (select count(distinct chat_id) from messages, today_b
                         where wa_timestamp >= today_b.day_start and wa_timestamp < today_b.day_end),
      'serie_7d', coalesce((
        select jsonb_agg(d.cnt order by d.dia)
        from (
          select gs::date dia,
                 (select count(*) from messages m
                  where m.wa_timestamp >= gs and m.wa_timestamp < gs + interval '1 day') cnt
          from generate_series(
            (date_trunc('day', now()) - interval '6 days'), date_trunc('day', now()), interval '1 day') gs
        ) d
      ), '[]'::jsonb)
    ),

    -- ── Salud del equipo (score derivado) ────────────────────────────────
    'salud', (
      with s as (
        select
          (select count(*) from agentes where estado = 'activo')::numeric as activos,
          greatest((select count(*) from agentes), 1)::numeric            as total,
          (select count(*) from pendientes where prioridad = 'critico' and estado <> 'cerrado')::numeric as criticos
      )
      select jsonb_build_object(
        'score', score,
        'label', case when score >= 75 then 'Buena'
                      when score >= 50 then 'Regular' else 'En riesgo' end,
        'tono',  case when score >= 75 then 'ok'
                      when score >= 50 then 'warning' else 'danger' end)
      from (select least(100, greatest(0,
              round(70 + (activos/total)*30 - criticos*8)))::int as score from s) z
    ),

    -- ── Alertas críticas (reglas) ────────────────────────────────────────
    'alertas', (
      select coalesce(jsonb_agg(x order by ord), '[]'::jsonb) from (
        -- pendientes críticos abiertos (cliente esperando)
        select 1 ord, jsonb_build_object(
          'titulo', p.titulo,
          'detalle', 'Pendiente crítico · ' ||
            round(extract(epoch from now() - p.created_at)/3600) || ' hs sin resolver',
          'tono', 'danger') x
        from pendientes p where p.prioridad = 'critico' and p.estado <> 'cerrado'
        union all
        -- capacitaciones sin asistentes confirmados
        select 2, jsonb_build_object(
          'titulo', 'Capacitación sin asistentes: ' || c.nombre,
          'detalle', 'Programada sin confirmaciones de asistencia',
          'tono', 'warning')
        from capacitaciones c
        where c.estado in ('programada','en_curso')
          and not exists (select 1 from capacitacion_asistencia a
                          where a.capacitacion_id = c.id and a.asistio)
        union all
        -- reclamos detectados (eventos objeción)
        select 3, jsonb_build_object(
          'titulo', 'Reclamos detectados',
          'detalle', cnt || ' mensajes con objeción/reclamo en el día',
          'tono', 'warning')
        from (select count(*) cnt from commercial_events
              where type = 'objecion' and status <> 'dismissed') r
        where r.cnt > 0
      ) s
    ),

    -- ── Oportunidades detectadas por IA ──────────────────────────────────
    'oportunidades', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'titulo', coalesce(title, 'Oportunidad'),
        'detalle', coalesce(description, ''),
        'nivel', coalesce(importance, 'medio')) order by created_at desc), '[]'::jsonb)
      from commercial_events
      where type in ('venta','consulta','seguimiento') and status = 'open'
    ),

    -- ── Pendientes (donut) ───────────────────────────────────────────────
    'pendientes', jsonb_build_object(
      'total', (select count(*) from pendientes where estado <> 'cerrado'),
      'criticos', (select count(*) from pendientes where prioridad = 'critico' and estado <> 'cerrado'),
      'en_proceso', (select count(*) from pendientes where estado = 'en_proceso'),
      'pendientes', (select count(*) from pendientes
                     where estado = 'pendiente' and prioridad <> 'critico')
    ),

    -- ── Ranking de agentes ───────────────────────────────────────────────
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
      where a.estado <> 'baja'
    ), '[]'::jsonb),

    -- ── Actividad de grupos (7d) ─────────────────────────────────────────
    'grupos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nombre', c.name, 'tipo', c.type,
        'mensajes_7d', g.cnt,
        'estado', case when g.cnt = 0 then 'inactivo'
                       when g.cnt >= 10 then 'activo' else 'atencion' end,
        'actividad', case when g.cnt = 0 then 'baja'
                          when g.cnt >= 10 then 'alta' else 'media' end
      ) order by g.cnt desc)
      from chats c
        join (
          select ch.id, count(m.id) cnt
          from chats ch
            left join messages m on m.chat_id = ch.id
              and m.wa_timestamp >= (select since from win7)
          group by ch.id
        ) g on g.id = c.id
    ), '[]'::jsonb),

    -- ── Línea de tiempo (hoy) ────────────────────────────────────────────
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ts', ts, 'tipo', tipo, 'tono', tono, 'titulo', titulo, 'detalle', detalle)
        order by ts desc)
      from (
        select e.created_at ts,
          case e.type when 'objecion' then 'Alerta' when 'venta' then 'Oportunidad'
                      else 'Evento' end tipo,
          case e.type when 'objecion' then 'danger' when 'venta' then 'ok' else 'brand' end tono,
          coalesce(e.title, 'Evento comercial') titulo,
          coalesce(e.description, '') detalle
        from commercial_events e, today_b
        where e.created_at >= today_b.day_start and e.created_at < today_b.day_end
        union all
        select p.created_at, 'Pendiente', 'warning', p.titulo, coalesce(p.descripcion, '')
        from pendientes p, today_b
        where p.created_at >= today_b.day_start and p.created_at < today_b.day_end
      ) u
      limit 8
    ), '[]'::jsonb)
  );
$$;

-- -----------------------------------------------------------------------------
-- Buscador global (FR-021): mensajes + transcripciones, filtrable por tipo.
-- tipo ∈ mensajes | audios | imagenes | personas | grupos | pendientes | eventos
-- -----------------------------------------------------------------------------
create or replace function search_everything(p_q text, p_tipo text default 'mensajes')
returns jsonb
language sql stable security invoker as $$
  select coalesce(jsonb_agg(x order by ts desc), '[]'::jsonb) from (
    -- Mensajes (texto) + transcripciones (audio)
    select m.wa_timestamp ts, jsonb_build_object(
      'tipo', m.type, 'texto', coalesce(m.body, tr.text),
      'chat', c.name, 'remitente', ct.display_name, 'message_id', m.id) x
    from messages m
      join chats c on c.id = m.chat_id
      left join contacts ct on ct.id = m.sender_id
      left join transcriptions tr on tr.message_id = m.id
    where p_q <> '' and (
        m.body ilike '%' || p_q || '%' or tr.text ilike '%' || p_q || '%')
      and (p_tipo = 'mensajes'
           or (p_tipo = 'audios' and m.type = 'audio')
           or (p_tipo = 'imagenes' and m.type = 'image'))
    limit 30
  ) s;
$$;
