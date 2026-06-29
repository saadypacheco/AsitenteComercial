-- Seed de sesiones de capacitación con Zoom (demo). Corre después de 03.
-- Idempotente: completa zoom de las existentes + agrega un par de sesiones futuras.
do $$
declare
  t  uuid := '00000000-0000-0000-0000-0000000000a1';
  e1 uuid := '00000000-0000-0000-0000-0000000000e1';
begin
  -- Zoom + duración de las capacitaciones que ya existen
  update capacitaciones set zoom_url = 'https://zoom.us/j/0000000001', zoom_meeting_id = '0000000001', duracion_min = 90
    where tenant_id = t and zoom_url is null;

  -- Sesiones futuras para una agenda más rica (si no existen ya)
  insert into capacitaciones (tenant_id, nombre, nombre_en, descripcion, estado, instructor_id, fecha, zoom_url, zoom_meeting_id, duracion_min)
  select t, v.nombre, v.nombre_en, v.descr, 'programada', e1, now() + (v.h || ' hours')::interval, v.url, v.mid, v.dur
  from (values
    ('Capacitación inicial',          'Initial training',        'Estructura de presentación y objeciones', 4,  'https://zoom.us/j/1112223334', '1112223334', 90),
    ('Productos de seguro de vida',   'Life insurance products', 'Catálogo y coberturas',                   28, 'https://zoom.us/j/2223334445', '2223334445', 60),
    ('Práctica de cierre con coach',  'Closing practice w/ coach','Role-play de cierre',                     52, 'https://zoom.us/j/3334445556', '3334445556', 60)
  ) as v(nombre, nombre_en, descr, h, url, mid, dur)
  where not exists (select 1 from capacitaciones c where c.tenant_id = t and c.nombre = v.nombre);
end $$;
