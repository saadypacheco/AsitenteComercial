-- Datos de prueba para VER el dashboard sin bridge real.
-- Timestamps con now() - intervalos chicos → caen en "hoy" (ventana ET).
-- Un tenant, dos grupos, varios mensajes (incluye un audio con transcripción y una imagen).

insert into tenants (id, name, ia_wa_jid) values
  ('00000000-0000-0000-0000-0000000000a1', 'Demo Líder', 'obs-demo@c.us')
on conflict do nothing;

insert into contacts (id, tenant_id, wa_jid, display_name) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', '5491111@c.us', 'Ana'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', '5492222@c.us', 'Bruno'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a1', '5493333@c.us', 'Carla')
on conflict do nothing;

insert into chats (id, tenant_id, wa_chat_id, type, name) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '111@g.us', 'group', 'Grupo Ventas Norte'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a1', '222@g.us', 'group', 'Capacitación')
on conflict do nothing;

insert into messages (id, tenant_id, wa_message_id, chat_id, sender_id, type, body, wa_timestamp, raw) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1', 'seed-m1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'text', 'Buenos días equipo, arrancamos el día 💪', now() - interval '55 minutes', '{}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000a1', 'seed-m2', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'text', 'Cerré la póliza de vida con el cliente Pérez 🎉', now() - interval '48 minutes', '{}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000a1', 'seed-m3', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b3', 'audio', null, now() - interval '40 minutes', '{}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000a1', 'seed-m4', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'text', 'El cliente Gómez dijo que está muy caro, hay que ver una opción más económica', now() - interval '33 minutes', '{}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000a1', 'seed-m5', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'text', '¿Alguien tiene el formulario de salud actualizado?', now() - interval '20 minutes', '{}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d6', '00000000-0000-0000-0000-0000000000a1', 'seed-m6', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b3', 'text', 'Recordatorio: reunión de capacitación a las 3pm', now() - interval '15 minutes', '{}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000a1', 'seed-m7', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', 'text', 'Confirmo asistencia', now() - interval '12 minutes', '{}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d8', '00000000-0000-0000-0000-0000000000a1', 'seed-m8', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', 'image', 'material de la capacitación', now() - interval '8 minutes', '{}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000a1', 'seed-m9', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b3', 'text', 'Gracias! lo reviso', now() - interval '4 minutes', '{}'::jsonb)
on conflict do nothing;

-- Transcripción del audio (US3 previsualizado): se ve en el detalle del chat.
insert into transcriptions (message_id, tenant_id, text, language, engine, confidence) values
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000a1',
   'El cliente Gómez quiere renovar el seguro de auto, lo llamo mañana a primera hora',
   'es', 'faster-whisper:small', 0.93)
on conflict do nothing;

-- Metadata de la imagen (FR-016): se registra sin analizar contenido.
insert into media (tenant_id, message_id, mime_type, storage_path, downloaded) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d8', 'image/jpeg', 'wa-media/seed-m8.jpg', false)
on conflict do nothing;
