-- Seed de la Ruta de Capacitación (demo): 5 etapas + progreso por agente (funnel).
-- Corre después de 03 (agentes). Idempotente.
do $$
declare
  t  uuid := '00000000-0000-0000-0000-0000000000a1';
  g1 uuid := '11111111-1111-1111-1111-111111111101';
  g2 uuid := '11111111-1111-1111-1111-111111111102';
  g3 uuid := '11111111-1111-1111-1111-111111111103';
  g4 uuid := '11111111-1111-1111-1111-111111111104';
  g5 uuid := '11111111-1111-1111-1111-111111111105';
begin
  if exists (select 1 from capacitacion_etapas) then return; end if;

  insert into capacitacion_etapas (id, tenant_id, nombre, nombre_en, descripcion, orden) values
    (g1, t, 'Bienvenida e inducción',  'Welcome & induction',   'Primer contacto, cultura y herramientas', 1),
    (g2, t, 'Conocé los productos',    'Get to know the products','Catálogo de seguros y coberturas',       2),
    (g3, t, 'Técnicas de venta',       'Sales techniques',      'Prospección, objeciones y cierre',         3),
    (g4, t, 'Manejo del sistema',      'Using the system',      'CRM, WhatsApp y carga de datos',           4),
    (g5, t, 'Certificación final',     'Final certification',   'Evaluación y certificación',               5)
  on conflict do nothing;

  -- Progreso por agente (funnel descendente). completado = 1..N, en_curso = N+1.
  -- María(e1): 5 completadas · Juan(e2): 4+en_curso · Ana(e3): 3+en_curso ·
  -- Luis(e4): 2+en_curso · Sofía(e5): 1+en_curso.
  -- (etapas ordenadas g1..g5)
  insert into etapa_progreso (tenant_id, agente_id, etapa_id, estado, completado_at)
  select t, a.agente, e.etapa,
    case when e.orden <= a.done then 'completado'
         when e.orden = a.done + 1 then 'en_curso' else 'pendiente' end,
    case when e.orden <= a.done then now() - ((6 - e.orden) || ' days')::interval else null end
  from (values
    ('00000000-0000-0000-0000-0000000000e1'::uuid, 5),
    ('00000000-0000-0000-0000-0000000000e2'::uuid, 4),
    ('00000000-0000-0000-0000-0000000000e3'::uuid, 3),
    ('00000000-0000-0000-0000-0000000000e4'::uuid, 2),
    ('00000000-0000-0000-0000-0000000000e5'::uuid, 1)
  ) as a(agente, done)
  cross join (values (g1,1),(g2,2),(g3,3),(g4,4),(g5,5)) as e(etapa, orden)
  on conflict (agente_id, etapa_id) do nothing;
end $$;
