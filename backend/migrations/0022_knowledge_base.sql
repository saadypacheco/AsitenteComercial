-- =============================================================================
-- mentorcomercial · 0022_knowledge_base.sql
-- Base de conocimiento RAG: documentos oficiales (productos, guiones, objeciones)
-- que el Coach IA puede citar para responder preguntas de los agentes.
-- Aplicar DESPUÉS de 0021. Idempotente.
-- =============================================================================

create table if not exists kb_documents (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references tenants(id) on delete cascade,  -- null = global (compartido)
  titulo      text not null,
  contenido   text not null,
  categoria   text not null default 'general'
                check (categoria in ('producto','guion','objeciones','politica','general')),
  embedding   vector(1536),      -- vector de embedding (null hasta indexar)
  ts          tsvector generated always as (to_tsvector('spanish', titulo || ' ' || contenido)) stored,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_kb_ts on kb_documents using gin(ts);
create index if not exists idx_kb_tenant on kb_documents (tenant_id, categoria);
-- Índice de embedding (solo útil cuando haya vectores cargados)
-- create index if not exists idx_kb_embedding on kb_documents
--   using ivfflat (embedding vector_cosine_ops) with (lists = 10);

alter table kb_documents enable row level security;

-- Seeds: documentos de ejemplo (globales, tenant_id null)
insert into kb_documents (titulo, categoria, contenido) values
(
  'Seguro de Vida — Preguntas frecuentes',
  'producto',
  'El seguro de vida es un contrato entre el asegurado y la aseguradora por el cual, al fallecimiento del titular, la compañía paga un capital a los beneficiarios. Principales ventajas: protección familiar, deducción fiscal, ahorro a largo plazo. Los beneficiarios se designan en la póliza. El costo depende de la edad, el monto asegurado y el estado de salud.'
),
(
  'Cómo manejar la objeción "Es muy caro"',
  'objeciones',
  'Cuando el cliente dice "es muy caro", hay que reformular el valor. Técnica: "Entiendo. ¿Cuánto vale para usted la tranquilidad de saber que su familia va a estar protegida si algo le pasa?" Luego desglosa el costo diario: si la póliza cuesta $50/mes, son menos de $2 por día — el precio de un café. Alternativa: mostrar coberturas más accesibles o pagos mensuales.'
),
(
  'Guión de primera llamada con prospecto',
  'guion',
  'Apertura: "Hola [Nombre], soy [Tu nombre] de AIG. ¿Es un buen momento para hablar 3 minutos?" Si dice sí: "Quería preguntarle: ¿tiene usted algún tipo de seguro de vida hoy?" Escuchar su respuesta. Si no tiene: "¿Le gustaría saber cómo proteger a su familia con un plan que se adapta a su presupuesto?" Cierre de cita: "¿Podría reunirme con usted el martes o el jueves para mostrarle las opciones?"'
),
(
  'Plan de Retiro — Cómo presentarlo',
  'producto',
  'El plan de retiro es una herramienta de ahorro a largo plazo que combina inversión + protección. Puntos clave para presentar: 1) Complementa el retiro social que generalmente no alcanza. 2) Los aportes son deducibles de impuestos hasta cierto límite. 3) El dinero crece libre de impuestos mientras está en el plan. 4) Al retiro, el cliente puede recibir una renta mensual. Perfil del cliente ideal: entre 30-55 años, con ingresos estables, interesado en su futuro.'
),
(
  'Proceso de cierre de una venta',
  'guion',
  'El cierre ocurre cuando el cliente tiene suficiente valor percibido. Señales de compra: preguntas sobre precio, forma de pago, o cobertura específica. Técnica de cierre de alternativas: "¿Prefiere empezar con el plan básico o el intermedio?" Técnica de urgencia suave: "Este precio está disponible hasta fin de mes, ¿le gustaría asegurarlo hoy?" Si el cliente duda: "¿Qué necesitaría ver para sentirse cómodo dando el siguiente paso?"'
),
(
  'Cómo manejar la objeción "Necesito pensarlo"',
  'objeciones',
  '"Necesito pensarlo" suele ser una objeción encubierta. Primero, validar: "Por supuesto, es una decisión importante." Luego descubrir la objeción real: "Solo para ayudarle mejor, ¿hay algún punto específico sobre el que quiera reflexionar?" Si menciona precio: ver objeción de precio. Si menciona familia: "¿Le parece bien que hablemos con su pareja juntos para resolverles las dudas a los dos?" No presionar: dar un plazo concreto para el seguimiento.'
)
on conflict do nothing;
