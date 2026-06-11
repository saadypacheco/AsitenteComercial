-- Seed de DETECCIÓN DE ESTANCAMIENTO/ABANDONO (demo): 3 agentes en riesgo para que
-- el bloque "Agentes en riesgo" de /ia-insights se vea con datos claros.
-- Cruza las 3 señales reales: actividad (messages), onboarding/asistencia
-- (etapa_progreso) y producción (pendientes cerrados — proxy hasta WFG).
-- Corre DESPUÉS de 03 (agentes) y 07 (ruta). Idempotente: guard sobre e6.
--
-- Casos sembrados (bajo Juan e2, para que entren tanto en la vista del owner como
-- en el scope de la líder demo —anclada a Juan—):
--   • Pedro Núñez (e6)  — ALTO:  22d sin actividad · nunca arrancó onboarding · sin cierres
--   • Carla Vega  (e7)  — ALTO:  nunca escribió (alta 16d) · trabada en etapa 1 · sin cierres
--   • Diego Salas (e8)  — MEDIO: 8d sin actividad · trabado en etapa 3 (con algo de producción)
do $$
declare
  t   uuid := '00000000-0000-0000-0000-0000000000a1';   -- tenant Demo Líder
  c1  uuid := '00000000-0000-0000-0000-0000000000c1';   -- chat Grupo Ventas Norte
  b6  uuid := '00000000-0000-0000-0000-0000000000b6';   -- contact (→ Pedro Núñez)
  b8  uuid := '00000000-0000-0000-0000-0000000000b8';   -- contact (→ Diego Salas)
  e2  uuid := '00000000-0000-0000-0000-0000000000e2';   -- agente Juan Pérez (líder demo)
  e6  uuid := '00000000-0000-0000-0000-0000000000e6';   -- agente Pedro Núñez
  e7  uuid := '00000000-0000-0000-0000-0000000000e7';   -- agente Carla Vega (sin contacto: nunca escribió)
  e8  uuid := '00000000-0000-0000-0000-0000000000e8';   -- agente Diego Salas
begin
  if exists (select 1 from agentes where id = e6) then
    raise notice 'riesgo seed ya aplicado — salteando';
    return;
  end if;

  -- Contactos (Carla no tiene: nunca escribió en los grupos → señal de inactividad)
  insert into contacts (id, tenant_id, wa_jid, phone, display_name) values
    (b6, t, '5496666@c.us', '5496666', 'Pedro Núñez'),
    (b8, t, '5498888@c.us', '5498888', 'Diego Salas')
  on conflict do nothing;

  -- AGENTES en riesgo (bajo María, activos pero estancados)
  insert into agentes (id, tenant_id, contact_id, nombre, apellido, celular, email, estado, superior_id, ciudad, origen_alta, fecha_alta) values
    (e6, t, b6,   'Pedro', 'Núñez', '5496666', 'pedro@demo.com', 'activo', e2, 'Tampa',   'csv',          current_date - 30),
    (e7, t, null, 'Carla', 'Vega',  '5497777', 'carla@demo.com', 'activo', e2, 'Orlando', 'capacitacion', current_date - 16),
    (e8, t, b8,   'Diego', 'Salas', '5498888', 'diego@demo.com', 'activo', e2, 'Miami',   'csv',          current_date - 40)
  on conflict do nothing;

  -- ACTIVIDAD vieja: Pedro escribió hace ~22-28 días y dejó de aparecer.
  insert into messages (id, tenant_id, wa_message_id, chat_id, sender_id, type, body, wa_timestamp, raw)
  select gen_random_uuid(), t, 'gen-b6-'||g, c1, b6,
         'text', 'Mensaje antiguo #'||g, now() - ((22 + g) || ' days')::interval, '{}'::jsonb
  from generate_series(1, 5) g on conflict do nothing;
  -- Diego: última actividad hace ~8-12 días (riesgo medio).
  insert into messages (id, tenant_id, wa_message_id, chat_id, sender_id, type, body, wa_timestamp, raw)
  select gen_random_uuid(), t, 'gen-b8-'||g, c1, b8,
         'text', 'Última actividad #'||g, now() - ((7 + g) || ' days')::interval, '{}'::jsonb
  from generate_series(1, 4) g on conflict do nothing;

  -- ONBOARDING — Carla trabada en etapa 1; Diego avanzó 3 y se trabó.
  --   Pedro: NADA (nunca arrancó → 0 etapas completadas).
  insert into etapa_progreso (tenant_id, agente_id, etapa_id, estado, completado_at)
  select t, a.agente, e.id,
    case when e.orden <= a.done then 'completado'
         when e.orden = a.done + 1 then 'en_curso' else 'pendiente' end,
    case when e.orden <= a.done then now() - interval '14 days' else null end
  from (values (e7, 1), (e8, 3)) as a(agente, done)
  cross join (select id, orden from capacitacion_etapas where tenant_id = t) e
  on conflict (agente_id, etapa_id) do nothing;

  -- PRODUCCIÓN — Diego tiene 1 cierre reciente (riesgo medio, no nulo).
  --   Pedro y Carla: 0 cierres (proxy de producción nula).
  insert into pendientes (tenant_id, agente_id, titulo, tipo, prioridad, estado, fecha_cierre, created_at) values
    (t, e8, 'Gestión cerrada — Diego', 'tarea', 'bajo', 'cerrado', now() - interval '6 days', now() - interval '8 days');

  raise notice 'riesgo seed aplicado OK';
end $$;
