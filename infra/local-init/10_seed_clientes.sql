-- Seed de cartera de clientes (demo). Variado a propósito: algunos por renovar
-- pronto, otros sin seguimiento, algunos con cross-sell (vida → retiro), VIPs.
-- Corre después de 03 (agentes). Idempotente.
do $$
declare
  t  uuid := '00000000-0000-0000-0000-0000000000a1';
  e1 uuid := '00000000-0000-0000-0000-0000000000e1';
  e2 uuid := '00000000-0000-0000-0000-0000000000e2';
  e3 uuid := '00000000-0000-0000-0000-0000000000e3';
  e4 uuid := '00000000-0000-0000-0000-0000000000e4';
  e5 uuid := '00000000-0000-0000-0000-0000000000e5';
begin
  if exists (select 1 from clientes) then return; end if;

  insert into clientes (tenant_id, nombre, telefono, email, agente_id, producto, estado, valor_poliza, vencimiento, ultimo_contacto, vip) values
    (t, 'Cliente Pérez',  '+1 305 555 0101', 'perez@mail.com',  e2, 'vida',   'activo',    4500, current_date + 15, current_date - 40, true),
    (t, 'Familia Díaz',   '+1 305 555 0102', 'diaz@mail.com',   e1, 'retiro', 'activo',    8000, current_date + 25, current_date - 5,  false),
    (t, 'Cliente Gómez',  '+1 813 555 0103', 'gomez@mail.com',  e4, 'vida',   'activo',    3200, current_date + 8,  current_date - 60, true),
    (t, 'Roberto Soto',   '+1 305 555 0104', 'soto@mail.com',   e2, 'vida',   'activo',    2800, current_date + 90, null,              false),
    (t, 'Lucía Ramírez',  '+1 407 555 0105', 'ramirez@mail.com',e3, 'auto',   'activo',    1500, current_date + 12, current_date - 10, false),
    (t, 'Carlos Vega',    '+1 305 555 0106', 'vega@mail.com',   e5, 'vida',   'activo',    5200, current_date + 200,current_date - 3,  false),
    (t, 'Marta Ríos',     '+1 305 555 0107', 'rios@mail.com',   e1, 'salud',  'activo',    2100, current_date - 5,  current_date - 45, false),
    (t, 'Diego Torres',   '+1 407 555 0108', 'torres@mail.com', e3, 'retiro', 'activo',    9500, current_date + 150,current_date - 2,  true),
    (t, 'Elena Cruz',     '+1 813 555 0109', 'cruz@mail.com',   e4, 'vida',   'activo',    3800, current_date + 20, current_date - 35, false),
    (t, 'Pablo Núñez',    '+1 305 555 0110', 'nunez@mail.com',  e2, 'hogar',  'prospecto', 1200, current_date + 300,current_date - 1,  false);
end $$;
