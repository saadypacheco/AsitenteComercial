# Feature Specification: Captura WhatsApp → BD + transcripción + dashboard "¿Qué pasó hoy?"

**Feature Branch**: `001-captura-whatsapp-bd`

**Created**: 2026-06-07

**Status**: Draft

**Input**: User description: "Captura WhatsApp → BD + transcripción + dashboard ¿Qué pasó hoy?"

## Clarifications

### Session 2026-06-08 (rediseño de US2 "¿Qué pasó hoy?")

- Q: ¿Qué bloques componen la página "¿Qué pasó hoy?"? → A: 5 bloques — (1) Pulso del día (KPIs),
  (2) Necesita tu atención (pendientes), (3) Eventos comerciales (US4), (4) Actividad por grupo,
  (5) Buscador.
- Q: ¿Qué regla define que algo "Necesita tu atención / está pendiente" (el observador es pasivo,
  no hay leído/respondido de WhatsApp)? → A: combinada — (a) eventos comerciales de tipo consulta u
  objeción **sin un mensaje de respuesta posterior** en el mismo grupo dentro de la ventana del día,
  **y** (b) grupos/chats cuyo **último mensaje es de un agente** sin respuesta posterior tras superar
  un umbral de tiempo. El marcado/priorización **manual** por la líder queda FUERA de F-001 (feature
  posterior: requiere que la líder actúe sobre el chat, algo que el observador pasivo no permite hoy).
- Q: ¿F-001 registra altas/bajas de participantes de grupo? → A: registrar la metadata del evento de
  membresía **best-effort si WAHA lo emite** (como un estado del grupo, trazable), mostrado
  discretamente dentro de "Actividad por grupo"; sin bloque propio; no bloquea si el bridge no lo
  manda. (Los agentes/líderes formales con jerarquía siguen siendo Producto ②.)
- Q: ¿Alcance del Buscador? → A: busca sobre el **texto de los mensajes + las transcripciones de
  audio**, con filtro por grupo y por fecha; cada resultado enlaza al mensaje en su contexto.

### Session 2026-06-07

- Q: Catálogo inicial de tipos de evento comercial → A: venta, objeción, seguimiento, consulta;
  campos mínimos por evento: tipo, fecha-hora, agente/contraparte (si identificable), resumen
  breve, y referencia(s) al/los mensaje(s) origen.
- Q: ¿Cómo se delimita "hoy" / zonas horarias? → A: zona horaria fija del negocio (horario del
  este de EE.UU., ET); el día es 00:00–23:59 ET.
- Q: Mensajes no-texto/no-audio (imagen, documento, sticker, ubicación) → A: registrar metadata
  (tipo, remitente, hora) y mostrarlos en la actividad, sin procesar/analizar el contenido.
- Q: Mensajes editados o borrados después de capturados → A: lo capturado es inmutable; la
  edición/borrado se registra como un nuevo estado (no se pierde el original).
- Q: Retención del contenido capturado → A: indefinida, sin borrado automático en F-001 (es la
  memoria comercial); la política de purga/anonimización se define en una feature posterior.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nada de lo que pasa en WhatsApp se pierde (Priority: P1)

La líder gestiona ~2.000 agentes y la comunicación diaria vive en WhatsApp, sobre todo en
grupos. Un participante observador dedicado (no la líder) está presente en esos grupos/chats
y todo lo que se dice queda guardado de forma fiable, con quién lo dijo, en qué grupo y cuándo.
La líder ya no depende de leer todo en el momento ni de su memoria: la conversación queda
registrada como una memoria consultable.

**Why this priority**: Es la base de todo el producto. Sin una captura fiable y completa no hay
memoria comercial, ni dashboard, ni nada aguas abajo. Entrega valor por sí sola: "no se me
escapa nada de lo que pasó en los grupos".

**Independent Test**: Con el observador agregado a un grupo de prueba, se envían varios mensajes
desde distintos participantes; luego se verifica que cada mensaje quedó guardado con su remitente,
grupo, fecha-hora y contenido, sin pérdidas ni duplicados.

**Acceptance Scenarios**:

1. **Given** el observador está presente en un grupo, **When** un participante envía un mensaje de
   texto, **Then** ese mensaje queda persistido con remitente, grupo, fecha-hora y contenido.
2. **Given** el sistema de captura se reinicia o cae momentáneamente, **When** vuelve a estar
   disponible, **Then** los mensajes que llegaron en el ínterin no se pierden y quedan guardados.
3. **Given** un mismo mensaje se procesa más de una vez (reintento), **When** se persiste,
   **Then** no se crea un registro duplicado.
4. **Given** el número personal de la líder, **When** ocurre cualquier captura, **Then** ese número
   nunca se usa para conectarse ni capturar (solo el número observador dedicado).

---

### User Story 2 - "¿Qué pasó hoy?" en un vistazo (Priority: P1)

Al abrir la aplicación (desde el celular), la líder ve una pantalla "¿Qué pasó hoy?" organizada en
**cinco bloques**: (1) **Pulso del día** (KPIs de un vistazo), (2) **Necesita tu atención**
(pendientes que requieren acción), (3) **Eventos comerciales** (lo extraído por IA — US4), (4)
**Actividad por grupo** (qué se movió en cada grupo/chat) y (5) **Buscador** (encontrar algo puntual
en lo capturado). En menos de un minuto entiende el pulso del día y qué quedó sin cerrar, sin tener
que abrir WhatsApp y scrollear decenas de grupos.

**Why this priority**: Es la cara visible del valor para la líder y lo que se demuestra al cliente.
Convierte la captura (invisible) en algo accionable y entendible de un vistazo, y resuelve el dolor
concreto de "¿qué quedó sin responder?".

**Independent Test**: Con datos ya capturados de un día, la líder abre el dashboard y ve los cinco
bloques poblados con datos reales de F-001 (pulso, pendientes, eventos, actividad por grupo,
búsqueda), y puede navegar al detalle de un grupo/mensaje.

**Acceptance Scenarios**:

1. **Given** hay actividad capturada hoy, **When** la líder abre "¿Qué pasó hoy?", **Then** ve el
   **Pulso del día** con métricas del día (volumen de mensajes, grupos/chats con actividad, cantidad
   de pendientes y de eventos comerciales).
2. **Given** hay un evento de consulta/objeción sin respuesta posterior o un chat cuyo último turno es
   de un agente sin respuesta, **When** la líder abre la pantalla, **Then** ese ítem aparece en el
   bloque **Necesita tu atención**.
3. **Given** un grupo con actividad, **When** la líder toca ese grupo en **Actividad por grupo**,
   **Then** ve el detalle de lo que pasó ahí hoy.
4. **Given** la líder busca un término en el **Buscador**, **When** ese término aparece en el texto de
   un mensaje o en una transcripción, **Then** obtiene el/los resultado(s) y puede abrir el mensaje en
   su contexto.
5. **Given** la pantalla se usa desde un celular, **When** la líder la abre, **Then** la información
   es legible y navegable en pantalla chica (mobile-first).

---

### User Story 3 - Los audios también se leen (Priority: P2)

Buena parte de la comunicación en los grupos son notas de voz. El sistema transcribe esos audios
a texto, de modo que la líder pueda leer y buscar lo que se dijo sin tener que escuchar cada nota.

**Why this priority**: Sin transcripción, una porción grande de la conversación queda fuera de la
memoria consultable. Es alto valor pero depende de que la captura (US1) ya funcione.

**Independent Test**: Se envía una nota de voz a un grupo de prueba; se verifica que aparece su
transcripción en texto, asociada al audio original y consultable junto al resto de los mensajes.

**Acceptance Scenarios**:

1. **Given** un participante envía una nota de voz, **When** el sistema la procesa, **Then** queda
   disponible una transcripción en texto asociada a ese audio.
2. **Given** una nota de voz en un idioma soportado, **When** se transcribe, **Then** la
   transcripción está en el idioma original del audio.
3. **Given** una transcripción generada, **When** la líder la consulta, **Then** puede ver/llegar
   al audio original que la originó (trazabilidad).

---

### User Story 4 - Los eventos comerciales del día, con evidencia (Priority: P2)

Más allá del "qué se habló", la líder quiere ver **qué pasó comercialmente**: ventas mencionadas,
objeciones, seguimientos pendientes, consultas. El sistema lee lo capturado (incluidas las
transcripciones) y extrae esos eventos como una lista estructurada dentro de "¿Qué pasó hoy?",
y cada evento se puede abrir para ver el mensaje exacto que lo originó.

**Why this priority**: Es el diferencial del producto: convertir el caos de WhatsApp en eventos
comerciales accionables. Depende de que la captura (US1) y la transcripción (US3) ya funcionen, y
la trazabilidad es condición para que la líder confíe en lo que la IA infiere.

**Independent Test**: Con mensajes de prueba que contengan una venta y una objeción claras, se
verifica que aparecen como eventos comerciales del tipo correcto y que cada uno enlaza al mensaje
origen.

**Acceptance Scenarios**:

1. **Given** mensajes capturados que describen una venta, **When** el sistema los procesa, **Then**
   aparece un evento comercial de tipo "venta" en el resumen del día.
2. **Given** un evento comercial extraído, **When** la líder lo abre, **Then** ve el/los mensaje(s)
   de origen del que se derivó (trazabilidad).
3. **Given** un mensaje ambiguo o sin contenido comercial, **When** el sistema lo procesa, **Then**
   no inventa un evento comercial (preferir no extraer antes que extraer algo falso).
4. **Given** la vista del día, **When** la líder la mira, **Then** distingue claramente qué es
   actividad capturada (hecho) y qué es un evento inferido por IA (interpretación).

---

### Edge Cases

- ¿Qué pasa cuando el número observador se desconecta o lo desloguean del bridge? (la captura no
  debe perder mensajes silenciosamente; debe ser visible que hubo una interrupción).
- Mensaje que no es texto ni audio (imagen, sticker, documento, ubicación): se registra su metadata
  y aparece en la actividad, sin analizar el contenido (FR-016).
- ¿Qué pasa con un audio en un idioma no soportado o ininteligible? (no debe romper el flujo; queda
  como audio sin transcripción utilizable, registrado igual).
- Mensajes editados o eliminados después de capturados: lo capturado es inmutable; el cambio se
  registra como nuevo estado (FR-017).
- "¿Qué pasó hoy?" un día sin actividad: debe mostrar un estado vacío claro, no un error.
- "Necesita tu atención" sin pendientes: el bloque debe mostrar un estado vacío positivo ("nada
  pendiente"), no desaparecer ni dar error (FR-020).
- Una consulta/objeción que SÍ recibió respuesta posterior dentro del día NO debe figurar como
  pendiente; y un chat cuyo último turno es de la propia líder tampoco (FR-020).
- El bridge (WAHA) no emite eventos de alta/baja de participantes: la "Actividad por grupo" no muestra
  movimientos, pero la captura y el resto del dashboard siguen funcionando (FR-022).
- Buscador sin coincidencias: devuelve un estado vacío claro (no error); términos en transcripciones se
  encuentran igual que en mensajes de texto (FR-021).
- ¿Qué pasa con un volumen muy alto de mensajes en poco tiempo (picos)? (la cola durable absorbe el
  pico sin perder mensajes; el procesamiento puede ir detrás).
- "Hoy" se delimita por zona horaria fija del negocio (ET, 00:00–23:59), independientemente de la
  zona de cada grupo o participante (FR-018).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST capturar automáticamente los mensajes entrantes de los grupos y chats
  donde participa el número observador dedicado.
- **FR-002**: El sistema MUST realizar la captura exclusivamente a través del número observador
  dedicado y NUNCA usar el número/cuenta personal de la líder (principio constitucional I).
- **FR-003**: El sistema MUST persistir cada mensaje capturado con, al menos: remitente, grupo/chat
  de origen, fecha-hora, tipo (texto/audio/otro) y contenido.
- **FR-004**: El sistema MUST garantizar que no se pierdan mensajes ante caídas o reinicios
  (durabilidad) y que reprocesar un mismo mensaje no genere duplicados (idempotencia).
- **FR-005**: El sistema MUST transcribir a texto los mensajes de audio capturados.
- **FR-006**: El sistema MUST mantener trazabilidad: toda transcripción y todo dato derivado MUST
  poder enlazarse al mensaje/audio de origen (principio constitucional III).
- **FR-007**: El sistema MUST ofrecer una vista "¿Qué pasó hoy?" organizada en **cinco bloques**:
  (1) **Pulso del día**, (2) **Necesita tu atención**, (3) **Eventos comerciales**, (4) **Actividad
  por grupo** y (5) **Buscador**; y MUST permitir navegar desde cualquiera de ellos al detalle del
  grupo/mensaje de origen.
- **FR-008**: La vista "¿Qué pasó hoy?" y el detalle MUST ser usables mobile-first.
- **FR-009**: El sistema MUST restringir el acceso a los datos capturados a la líder y a los
  perfiles autorizados (los datos son sensibles).
- **FR-010**: La transcripción y la interfaz MUST soportar **español e inglés** en el demo (los
  agentes operan en EE.UU.). El diseño no debe impedir agregar más idiomas después.
- **FR-011**: La vista "¿Qué pasó hoy?" MUST incluir, mediante sus cinco bloques: (a) un **Pulso del
  día** con métricas agregadas (volumen del día, grupos/chats con actividad, conteo de pendientes y de
  eventos comerciales); (b) un bloque **Necesita tu atención** con los ítems pendientes (ver FR-020);
  (c) los **eventos comerciales** estructurados extraídos por IA (ventas, objeciones, seguimientos,
  consultas), cada uno trazable a su mensaje de origen; (d) la **actividad por grupo/chat** del día; y
  (e) un **Buscador** (ver FR-021). La actividad capturada (hecho) y los eventos inferidos por IA
  (interpretación) MUST mantenerse claramente diferenciados (FR-015).
- **FR-020**: El sistema MUST poblar el bloque **Necesita tu atención** combinando dos señales
  derivables de lo capturado (sin depender de estado de lectura/respuesta de WhatsApp, porque el
  observador es pasivo): (a) eventos comerciales de tipo **consulta** u **objeción** que NO tienen un
  mensaje de respuesta posterior en el mismo grupo dentro de la ventana del día; **y** (b) grupos/chats
  cuyo **último mensaje del día es de un agente** (no la líder) y supera un umbral de tiempo sin
  respuesta posterior. El marcado/priorización **manual** de ítems por la líder queda FUERA del alcance
  de F-001.
- **FR-021**: El sistema MUST ofrecer un **Buscador** que consulte el **texto de los mensajes** y las
  **transcripciones de audio**, con filtro por **grupo** y por **fecha**; cada resultado MUST enlazar
  al mensaje en su contexto (trazabilidad, principio constitucional III).
- **FR-022**: El sistema SHOULD registrar, **best-effort si el bridge (WAHA) emite el evento**, las
  **altas y bajas de participantes** de un grupo como metadata del estado del grupo (trazable), y
  mostrarlas de forma discreta dentro de la **Actividad por grupo**. La ausencia de estos eventos NO
  debe romper la captura ni el dashboard. La gestión formal de agentes/líderes (jerarquía, alta/baja
  administrada) queda FUERA de F-001 (Producto ②).
- **FR-012**: La captura para el demo MUST cubrir **grupos y chats 1:1** donde participe el número
  observador, corriendo sobre **1-2 grupos de prueba**.
- **FR-013**: El sistema MUST extraer, a partir de los mensajes capturados (texto y transcripciones
  de audio), **eventos comerciales** estructurados de uno de estos tipos iniciales: **venta,
  objeción, seguimiento, consulta**. Cada evento MUST registrar, como mínimo: tipo, fecha-hora,
  agente/contraparte (si es identificable), un resumen breve, y la(s) referencia(s) al/los
  mensaje(s) de origen.
- **FR-014**: Cada evento comercial extraído MUST enlazar a el/los mensaje(s) de origen del que se
  derivó, de modo que la líder pueda verificar la evidencia (principio constitucional III). No se
  muestra un evento sin su traza.
- **FR-015**: El sistema MUST distinguir entre la actividad capturada (hecho) y los eventos
  inferidos por IA (interpretación), de forma que la líder entienda qué es dato y qué es inferencia.
- **FR-016**: El sistema MUST registrar también los mensajes que no son texto ni audio (imagen,
  documento, sticker, ubicación, etc.) con su metadata (tipo, remitente, fecha-hora) y mostrarlos
  en la actividad del día, sin procesar ni analizar su contenido en F-001.
- **FR-017**: El sistema MUST tratar los mensajes capturados como inmutables; una edición o borrado
  posterior en WhatsApp MUST registrarse como un nuevo estado asociado al mensaje original, sin
  eliminar ni sobrescribir lo ya capturado.
- **FR-018**: El sistema MUST delimitar "hoy" según una zona horaria fija del negocio (horario del
  este de EE.UU., ET): el día abarca de 00:00 a 23:59 ET.
- **FR-019**: El sistema MUST conservar el contenido capturado (mensajes, transcripciones, eventos)
  de forma indefinida en F-001, sin borrado automático. La política de purga/anonimización queda
  fuera del alcance de F-001.

### Key Entities *(include if feature involves data)*

- **Mensaje**: una comunicación capturada (inmutable). Atributos: remitente, grupo/chat de origen,
  fecha-hora, tipo (texto/audio/otro), contenido, referencia al mensaje original en WhatsApp (para
  trazar y deduplicar), y estado (capturado / editado / borrado — los cambios se registran como
  nuevos estados, sin sobrescribir el original).
- **Grupo / Chat**: el espacio donde ocurre la conversación (grupo o 1:1). Atributos: identidad del
  grupo/chat, nombre visible, participantes relevantes.
- **Participante / Remitente**: quién envió el mensaje (un agente, la líder, etc.). Atributos:
  identidad, nombre visible.
- **Transcripción**: el texto derivado de un mensaje de audio. Atributos: texto, idioma, referencia
  al audio/mensaje origen.
- **Evento comercial**: una interpretación estructurada derivada por IA de uno o más mensajes.
  Atributos: tipo (venta | objeción | seguimiento | consulta), fecha-hora,
  agente/contraparte (si es identificable), resumen breve, y referencia(s) al/los mensaje(s) de
  origen (trazabilidad obligatoria).
- **Resumen del día**: la información que alimenta "¿Qué pasó hoy?" para una fecha dada, organizada en
  cinco bloques (Pulso · Necesita tu atención · Eventos comerciales · Actividad por grupo · Buscador) —
  combina actividad capturada (hecho) y eventos comerciales (inferencia), claramente diferenciados.
- **Ítem de atención (pendiente)**: un elemento que requiere acción de la líder, derivado de lo
  capturado (no marcado a mano en F-001). Atributos: motivo (consulta/objeción sin respuesta · chat con
  último turno de agente sin respuesta), grupo/chat, fecha-hora del disparador, y referencia(s) al/los
  mensaje(s) que lo originan (trazabilidad).
- **Evento de membresía de grupo** (opcional, best-effort): un cambio de participantes del grupo
  (alta/baja) registrado como estado del grupo cuando el bridge lo emite. Atributos: grupo, tipo
  (alta/baja), participante, fecha-hora.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los mensajes enviados a un grupo de prueba mientras el observador está
  activo quedan capturados y consultables (sin pérdidas).
- **SC-002**: Reprocesar el mismo lote de mensajes no genera registros duplicados (0 duplicados).
- **SC-003**: La líder entiende "qué pasó hoy" en menos de 1 minuto desde que abre la app.
- **SC-004**: Las notas de voz enviadas a un grupo de prueba quedan disponibles como texto
  consultable poco después de recibidas.
- **SC-005**: El número personal de la líder nunca se usa para la captura (verificable: ninguna
  conexión/credencial de captura corresponde a ese número).
- **SC-006**: Toda transcripción puede rastrearse hasta su audio/mensaje de origen (trazabilidad
  100%).
- **SC-007**: El 100% de los eventos comerciales mostrados enlazan a su mensaje de origen (ningún
  evento sin evidencia verificable).
- **SC-008**: En un conjunto de mensajes de prueba con eventos comerciales claros (venta, objeción),
  el sistema los identifica con el tipo correcto y no genera eventos falsos sobre mensajes sin
  contenido comercial.
- **SC-009**: En un conjunto de prueba con casos pendientes y casos resueltos, el bloque "Necesita tu
  atención" lista los pendientes (consulta/objeción sin respuesta y chats con último turno de agente)
  y NO lista los que recibieron respuesta posterior dentro del día (cero falsos pendientes evidentes).
- **SC-010**: Una búsqueda de un término presente en un mensaje de texto y en una transcripción
  devuelve ambos resultados, respetando el filtro por grupo y fecha, y cada resultado abre el mensaje
  en su contexto.

## Assumptions

- La captura de grupos se hace mediante un participante observador dedicado (número distinto al de
  la líder), asumiendo el riesgo de forma aislada en ese número descartable.
- El contenido capturado se conserva como memoria comercial del negocio (sin política de borrado
  automático en el alcance de F-001; la retención fina se define en una feature posterior).
- Los datos capturados residen en infraestructura autogestionada en región EE.UU.
- F-001 es el primer corte demostrable (F0-demo): captura fiable + transcripción + "¿Qué pasó hoy?"
  con actividad cruda **y** extracción de eventos comerciales con trazabilidad. Quedan FUERA de
  alcance (features posteriores): alertas y notificaciones proactivas, score/ranking de agentes,
  envío de mensajes/acciones desde la app, agente personal por Telegram, y onboarding/capacitación.
- El catálogo fino de tipos de evento comercial y sus campos puede refinarse en `/speckit-clarify`
  o `/speckit-plan`; para el demo alcanza con un conjunto inicial (venta, objeción, seguimiento,
  consulta).
- Español e inglés son los idiomas del demo; la arquitectura no debe cerrar la puerta a más.
- Existe acceso a 1-2 grupos de prueba y a un número observador dedicado para validar el demo.
- "Necesita tu atención" se deriva automáticamente de lo capturado (el observador es pasivo, no hay
  estado de leído/respondido de WhatsApp). El **marcado y la priorización manual** de pendientes por la
  líder son una **feature posterior** (requiere capacidad de la líder de actuar sobre el chat).
- El registro de altas/bajas de participantes de grupo es **best-effort**: depende de que el bridge
  (WAHA) emita esos eventos; si no, simplemente no se muestran movimientos.
