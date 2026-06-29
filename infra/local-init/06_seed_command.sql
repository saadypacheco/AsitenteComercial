-- Seed del Centro de Control (demo): valor económico de eventos + cliente/VIP en
-- pendientes + un par de pendientes extra a un agente para mostrar "saturación".
-- Corre después de 03/04. Idempotente.

-- Valor económico (USD) de oportunidades/ventas
update commercial_events set valor = case title
  when 'Cliente interesado en seguro de vida'    then 4500
  when '8 personas preguntaron por capacitación' then 12000
  when '4 consultas sobre nuevo producto'        then 8000
  when '3 clientes sin seguimiento'              then 6000
  else valor end
where valor is null;

-- Cliente + VIP en los pendientes mostrados
update pendientes set cliente = 'Cliente Pérez', cliente_en = 'Client Pérez', vip = true
  where titulo = 'Cliente Pérez espera respuesta' and cliente is null;
update pendientes set cliente = 'Toyota', cliente_en = 'Toyota'
  where titulo = 'Reclamo de producto sin resolver' and cliente is null;
update pendientes set cliente = 'Cliente Gómez', cliente_en = 'Client Gómez', vip = true
  where titulo = 'Renovación vence hoy — cliente Gómez' and cliente is null;
update pendientes set cliente = 'Familia Díaz', cliente_en = 'Díaz family'
  where titulo = 'Cotización seguro de vida — flia Díaz' and cliente is null;

-- Pendientes extra para Ana Torres (e3) → mostrar estado "Saturada" en el equipo
insert into pendientes (tenant_id, agente_id, titulo, titulo_en, cliente, cliente_en, tipo, prioridad, estado, creado_por, created_at)
select '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e3',
       v.titulo, v.titulo_en, v.cliente, v.cliente_en, 'seguimiento', 'alto', 'en_proceso', 'ia', now() - (v.h || ' hours')::interval
from (values
  ('Seguir cotización flia Ramírez', 'Follow up Ramírez family quote', 'Familia Ramírez', 'Ramírez family', 6),
  ('Reagendar visita cliente Soto',  'Reschedule client Soto visit',   'Cliente Soto',    'Client Soto',    7),
  ('Responder consulta de póliza',   'Answer policy inquiry',          'Cliente Vega',    'Client Vega',    9)
) as v(titulo, titulo_en, cliente, cliente_en, h)
where not exists (select 1 from pendientes p where p.titulo = v.titulo);
