-- =============================================================================
-- mentorcomercial · 0005_daily_views.sql
-- US2: lectura del dashboard "¿Qué pasó hoy?" (FR-007, FR-008, FR-018).
-- Funciones RPC que el frontend llama vía supabase.rpc(). SECURITY INVOKER →
-- respetan RLS (cada líder ve solo su tenant). La ventana "hoy" se calcula en
-- zona fija del negocio (ET), no en la del usuario.
-- Ref: specs/001-captura-whatsapp-bd/contracts/dashboard-api.md (§1, §2)
-- =============================================================================

-- Límites [inicio, fin) del día comercial ET que contiene `at_ts` (FR-018).
create or replace function business_day_bounds(at_ts timestamptz default now())
returns table(day_start timestamptz, day_end timestamptz)
language sql stable as $$
  select
    date_trunc('day', at_ts at time zone 'America/New_York') at time zone 'America/New_York',
    (date_trunc('day', at_ts at time zone 'America/New_York') + interval '1 day')
      at time zone 'America/New_York';
$$;

-- -----------------------------------------------------------------------------
-- Resumen del día (sección "hecho"): volumen, actividad por chat, lo más reciente.
-- -----------------------------------------------------------------------------
create or replace function daily_summary()
returns jsonb
language sql stable security invoker as $$
  with today_msgs as (
    select m.* from messages m
    where m.wa_timestamp >= (select day_start from business_day_bounds())
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

-- -----------------------------------------------------------------------------
-- Detalle de un chat HOY (ventana ET): mensajes + transcripción + media.
-- -----------------------------------------------------------------------------
create or replace function daily_chat_detail(p_chat_id uuid)
returns jsonb
language sql stable security invoker as $$
  select coalesce(jsonb_agg(x order by ts), '[]'::jsonb)
  from (
    select
      m.wa_timestamp as ts,
      jsonb_build_object(
        'message_id', m.id,
        'remitente', ct.display_name,
        'tipo', m.type,
        'body', m.body,
        'wa_timestamp', m.wa_timestamp,
        'transcripcion', case when tr.message_id is not null
          then jsonb_build_object('texto', tr.text, 'idioma', tr.language,
                                  'audio_message_id', tr.message_id)
          else null end,
        'media', case when md.id is not null
          then jsonb_build_object('tipo', m.type, 'storage_path', md.storage_path)
          else null end
      ) as x
    from messages m
      left join contacts ct on ct.id = m.sender_id
      left join transcriptions tr on tr.message_id = m.id
      left join media md on md.message_id = m.id
    where m.chat_id = p_chat_id
      and m.wa_timestamp >= (select day_start from business_day_bounds())
      and m.wa_timestamp <  (select day_end   from business_day_bounds())
  ) s;
$$;
