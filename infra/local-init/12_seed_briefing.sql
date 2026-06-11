-- Seed del Briefing diario (demo): deja el tenant Demo Líder "configurado" para que
-- la sección de Ajustes muestre el número de Cecilia y la hora ya cargados, y el
-- briefing automático tenga destinatario. Corre después de 02 (tenant). Idempotente.
-- (El número es un placeholder demo; el envío real requiere el número conectado a WAHA.)
update tenants
   set owner_wa_jid     = coalesce(owner_wa_jid, '5491133334444@c.us'),
       briefing_enabled = true,
       briefing_hora    = 18
 where name = 'Demo Líder';
