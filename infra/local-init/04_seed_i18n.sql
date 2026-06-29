-- Traducciones EN del seed (demo bilingüe). Corre DESPUÉS de 02/03 (cuando ya hay
-- datos). Idempotente: solo completa las columnas *_en que estén NULL.
-- En producción estas columnas quedan NULL para datos reales → la función cae al
-- texto original (coalesce). Las columnas las crea la migración 0010.

-- Pendientes (los 9 abiertos que se ven en alertas/timeline)
update pendientes set titulo_en = case titulo
  when 'Cliente Pérez espera respuesta'       then 'Client Pérez is awaiting a reply'
  when 'Reclamo de producto sin resolver'      then 'Unresolved product complaint'
  when 'Renovación vence hoy — cliente Gómez'  then 'Renewal due today — client Gómez'
  when 'Cotización seguro de vida — flia Díaz' then 'Life insurance quote — Díaz family'
  when 'Llamar a cliente interesado'           then 'Call interested client'
  when 'Enviar formulario de salud'            then 'Send health form'
  when 'Seguimiento post-venta'                then 'Post-sale follow-up'
  when 'Actualizar datos de contacto'          then 'Update contact details'
  when 'Revisar póliza vencida'                then 'Review expired policy'
  else titulo_en end
where titulo_en is null;

-- Eventos comerciales / oportunidades
update commercial_events set
  title_en = case title
    when 'Cliente interesado en seguro de vida'    then 'Client interested in life insurance'
    when '8 personas preguntaron por capacitación' then '8 people asked about training'
    when '4 consultas sobre nuevo producto'        then '4 inquiries about a new product'
    when '3 clientes sin seguimiento'              then '3 clients without follow-up'
    when 'Reclamo detectado en Ventas Norte'       then 'Complaint detected in North Sales'
    else title_en end,
  description_en = case title
    when 'Cliente interesado en seguro de vida'    then 'Juan Pérez: client asked about the new life insurance'
    when '8 personas preguntaron por capacitación' then 'High interest in product training'
    when '4 consultas sobre nuevo producto'        then 'Life insurance with extended coverage'
    when '3 clientes sin seguimiento'              then 'No contact in the last 7 days'
    when 'Reclamo detectado en Ventas Norte'       then 'A complaint about product X was detected in 4 messages'
    else description_en end
where title_en is null;

-- Capacitaciones
update capacitaciones set nombre_en = case nombre
  when 'Capacitación de Ventas Norte' then 'North Sales training'
  when 'Técnicas de cierre'           then 'Closing techniques'
  else nombre_en end
where nombre_en is null;

-- Grupos: nombre EN + limpiar el "Grupo " redundante en el nombre ES
update chats set name = 'Ventas Norte' where name = 'Grupo Ventas Norte';
update chats set name_en = case name
  when 'Ventas Norte'  then 'North Sales'
  when 'Capacitación'  then 'Training'
  else name_en end
where name_en is null;
