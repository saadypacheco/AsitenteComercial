-- Coordenadas del seed de agentes (Florida) para el mapa. Corre después del seed
-- de gestión (03). Idempotente: solo setea lat/lng si están NULL.
update agentes set lat = 25.7700, lng = -80.1900 where id = '00000000-0000-0000-0000-0000000000e1' and lat is null; -- María · Miami
update agentes set lat = 25.7550, lng = -80.2050 where id = '00000000-0000-0000-0000-0000000000e2' and lat is null; -- Juan · Miami
update agentes set lat = 28.5383, lng = -81.3792 where id = '00000000-0000-0000-0000-0000000000e3' and lat is null; -- Ana · Orlando
update agentes set lat = 27.9506, lng = -82.4572 where id = '00000000-0000-0000-0000-0000000000e4' and lat is null; -- Luis · Tampa
update agentes set lat = 25.7620, lng = -80.2300 where id = '00000000-0000-0000-0000-0000000000e5' and lat is null; -- Sofía · Miami
