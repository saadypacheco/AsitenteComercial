-- Seed del NÚCLEO DE GESTIÓN (rebanada F-002) para que el dashboard ejecutivo
-- "¡Hola Cecilia!" muestre datos REALES: agentes con jerarquía, pendientes,
-- eventos comerciales, capacitaciones y actividad de mensajes en 7 días.
--
-- Idempotente: todo va dentro de un guard "si ya hay agentes, no hacer nada",
-- para poder aplicarlo a mano sobre un volumen ya creado sin duplicar.
-- Reusa el tenant a1 y los contactos b1/b2/b3 del seed base (02_seed.sql).

do $$
declare
  t   uuid := '00000000-0000-0000-0000-0000000000a1';   -- tenant Demo Líder
  c1  uuid := '00000000-0000-0000-0000-0000000000c1';   -- chat Grupo Ventas Norte
  c2  uuid := '00000000-0000-0000-0000-0000000000c2';   -- chat Capacitación
  b1  uuid := '00000000-0000-0000-0000-0000000000b1';   -- contact (→ María López)
  b2  uuid := '00000000-0000-0000-0000-0000000000b2';   -- contact (→ Juan Pérez)
  b3  uuid := '00000000-0000-0000-0000-0000000000b3';   -- contact (→ Ana Torres)
  b4  uuid := '00000000-0000-0000-0000-0000000000b4';   -- contact (→ Luis Gómez)
  b5  uuid := '00000000-0000-0000-0000-0000000000b5';   -- contact (→ Sofía Ruíz)
  e1  uuid := '00000000-0000-0000-0000-0000000000e1';   -- agente María López (líder)
  e2  uuid := '00000000-0000-0000-0000-0000000000e2';   -- agente Juan Pérez
  e3  uuid := '00000000-0000-0000-0000-0000000000e3';   -- agente Ana Torres
  e4  uuid := '00000000-0000-0000-0000-0000000000e4';   -- agente Luis Gómez
  e5  uuid := '00000000-0000-0000-0000-0000000000e5';   -- agente Sofía Ruíz
  k1  uuid := '00000000-0000-0000-0000-0000000000f1';   -- capacitación sin asistentes
  k2  uuid := '00000000-0000-0000-0000-0000000000f2';   -- capacitación finalizada
begin
  if exists (select 1 from agentes) then
    raise notice 'gestion seed ya aplicado — salteando';
    return;
  end if;

  -- Contactos nuevos para Luis y Sofía (María/Juan/Ana ya existen en 02_seed) ---
  insert into contacts (id, tenant_id, wa_jid, phone, display_name) values
    (b4, t, '5494444@c.us', '5494444', 'Luis Gómez'),
    (b5, t, '5495555@c.us', '5495555', 'Sofía Ruíz')
  on conflict do nothing;

  -- AGENTES (jerarquía variable: María líder; Juan/Ana bajo María; Luis/Sofía bajo Juan)
  insert into agentes (id, tenant_id, contact_id, nombre, apellido, celular, email, estado, superior_id, ciudad, origen_alta) values
    (e1, t, b1, 'María', 'López', '5491111', 'maria@demo.com', 'activo', null, 'Miami',  'manual'),
    (e2, t, b2, 'Juan',  'Pérez', '5492222', 'juan@demo.com',  'activo', e1,   'Miami',  'manual'),
    (e3, t, b3, 'Ana',   'Torres','5493333', 'ana@demo.com',   'activo', e1,   'Orlando','csv'),
    (e4, t, b4, 'Luis',  'Gómez', '5494444', 'luis@demo.com',  'activo', e2,   'Tampa',  'csv'),
    (e5, t, b5, 'Sofía', 'Ruíz',  '5495555', 'sofia@demo.com', 'activo', e2,   'Miami',  'capacitacion')
  on conflict do nothing;

  -- ACTIVIDAD REAL: mensajes en 7 días por agente → alimenta ranking/grupos.
  -- (gen-<contacto>-<n>; spread en 168 h; alternando entre los 2 grupos)
  insert into messages (id, tenant_id, wa_message_id, chat_id, sender_id, type, body, wa_timestamp, raw)
  select gen_random_uuid(), t, 'gen-b1-'||g, case when g % 2 = 0 then c1 else c2 end, b1,
         'text', 'Actividad comercial registrada #'||g, now() - ((g % 168) || ' hours')::interval, '{}'::jsonb
  from generate_series(1, 55) g on conflict do nothing;
  insert into messages (id, tenant_id, wa_message_id, chat_id, sender_id, type, body, wa_timestamp, raw)
  select gen_random_uuid(), t, 'gen-b2-'||g, case when g % 2 = 0 then c1 else c2 end, b2,
         'text', 'Seguimiento de cliente #'||g, now() - ((g % 168) || ' hours')::interval, '{}'::jsonb
  from generate_series(1, 40) g on conflict do nothing;
  insert into messages (id, tenant_id, wa_message_id, chat_id, sender_id, type, body, wa_timestamp, raw)
  select gen_random_uuid(), t, 'gen-b3-'||g, case when g % 2 = 0 then c1 else c2 end, b3,
         'text', 'Gestión de póliza #'||g, now() - ((g % 168) || ' hours')::interval, '{}'::jsonb
  from generate_series(1, 35) g on conflict do nothing;
  insert into messages (id, tenant_id, wa_message_id, chat_id, sender_id, type, body, wa_timestamp, raw)
  select gen_random_uuid(), t, 'gen-b4-'||g, c1, b4,
         'text', 'Consulta de producto #'||g, now() - ((g % 168) || ' hours')::interval, '{}'::jsonb
  from generate_series(1, 29) g on conflict do nothing;
  insert into messages (id, tenant_id, wa_message_id, chat_id, sender_id, type, body, wa_timestamp, raw)
  select gen_random_uuid(), t, 'gen-b5-'||g, c2, b5,
         'text', 'Coordinación de cita #'||g, now() - ((g % 168) || ' hours')::interval, '{}'::jsonb
  from generate_series(1, 23) g on conflict do nothing;

  -- PENDIENTES — 3 críticos abiertos + 4 en proceso + 2 pendientes (donut = 9)
  insert into pendientes (tenant_id, agente_id, titulo, tipo, prioridad, estado, creado_por, created_at) values
    (t, e2, 'Cliente Pérez espera respuesta',          'seguimiento','critico','pendiente','ia',  now() - interval '48 hours'),
    (t, e3, 'Reclamo de producto sin resolver',        'reclamo',    'critico','pendiente','ia',  now() - interval '30 hours'),
    (t, e4, 'Renovación vence hoy — cliente Gómez',     'tarea',      'critico','pendiente','human',now() - interval '12 hours'),
    (t, e1, 'Cotización seguro de vida — flia Díaz',    'oportunidad','alto',   'en_proceso','ia', now() - interval '5 hours'),
    (t, e2, 'Llamar a cliente interesado',              'seguimiento','medio',  'en_proceso','ia', now() - interval '4 hours'),
    (t, e3, 'Enviar formulario de salud',              'tarea',      'medio',  'en_proceso','human',now() - interval '3 hours'),
    (t, e1, 'Seguimiento post-venta',                  'seguimiento','alto',   'en_proceso','ia', now() - interval '2 hours'),
    (t, e5, 'Actualizar datos de contacto',            'tarea',      'bajo',   'pendiente','human',now() - interval '90 minutes'),
    (t, e4, 'Revisar póliza vencida',                  'seguimiento','medio',  'pendiente','ia',  now() - interval '60 minutes');

  -- PENDIENTES CERRADOS por agente (alimentan "pendientes cerrados" del ranking)
  insert into pendientes (tenant_id, agente_id, titulo, tipo, prioridad, estado, fecha_cierre, created_at)
  select t, e1, 'Seguimiento cerrado #'||g, 'seguimiento','medio','cerrado', now()-interval '1 day', now()-((g)||' days')::interval
  from generate_series(1, 12) g;
  insert into pendientes (tenant_id, agente_id, titulo, tipo, prioridad, estado, fecha_cierre, created_at)
  select t, e2, 'Tarea cerrada #'||g, 'tarea','medio','cerrado', now()-interval '1 day', now()-((g)||' days')::interval
  from generate_series(1, 8) g;
  insert into pendientes (tenant_id, agente_id, titulo, tipo, prioridad, estado, fecha_cierre, created_at)
  select t, e3, 'Consulta resuelta #'||g, 'consulta','bajo','cerrado', now()-interval '1 day', now()-((g)||' days')::interval
  from generate_series(1, 7) g;
  insert into pendientes (tenant_id, agente_id, titulo, tipo, prioridad, estado, fecha_cierre, created_at)
  select t, e4, 'Gestión cerrada #'||g, 'seguimiento','medio','cerrado', now()-interval '1 day', now()-((g)||' days')::interval
  from generate_series(1, 6) g;
  insert into pendientes (tenant_id, agente_id, titulo, tipo, prioridad, estado, fecha_cierre, created_at)
  select t, e5, 'Cita cerrada #'||g, 'tarea','bajo','cerrado', now()-interval '1 day', now()-((g)||' days')::interval
  from generate_series(1, 4) g;

  -- EVENTOS COMERCIALES — oportunidades (bloque IA) + reclamo/venta (timeline hoy)
  insert into commercial_events (tenant_id, type, status, title, description, importance, confidence, created_by, created_at) values
    (t, 'consulta',   'open', '8 personas preguntaron por capacitación', 'Interés alto en formación de producto', 'alto',  0.88, 'ai', now() - interval '6 hours'),
    (t, 'consulta',   'open', '4 consultas sobre nuevo producto',        'Seguro de vida con cobertura ampliada',  'medio', 0.81, 'ai', now() - interval '5 hours'),
    (t, 'seguimiento','open', '3 clientes sin seguimiento',              'Sin contacto en los últimos 7 días',     'alto',  0.90, 'ai', now() - interval '4 hours'),
    (t, 'venta',      'open', 'Cliente interesado en seguro de vida',    'Juan Pérez: cliente consultó por el nuevo seguro de vida', 'alto', 0.92, 'ai', now() - interval '155 minutes'),
    (t, 'objecion',   'open', 'Reclamo detectado en Ventas Norte',       'Se detectó un reclamo del producto X en 4 mensajes', 'alto', 0.85, 'ai', now() - interval '175 minutes');

  -- CAPACITACIONES — una sin asistentes (alerta) + una finalizada con asistencia
  insert into capacitaciones (id, tenant_id, nombre, descripcion, estado, instructor_id, fecha) values
    (k1, t, 'Capacitación de Ventas Norte', 'Onboarding de producto para el grupo Ventas Norte', 'programada', e1, now() + interval '1 day'),
    (k2, t, 'Técnicas de cierre',           'María López compartió técnicas de cierre',          'finalizada', e1, now() - interval '2 hours')
  on conflict do nothing;
  insert into capacitacion_asistencia (capacitacion_id, agente_id, asistio) values
    (k2, e2, true), (k2, e3, true), (k2, e4, true)
  on conflict do nothing;

  raise notice 'gestion seed aplicado OK';
end $$;
