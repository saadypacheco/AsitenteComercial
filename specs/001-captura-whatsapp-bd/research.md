# Research — F-001 Captura WhatsApp → BD + transcripción + dashboard

**Fase 0 del plan.** Resuelve las incógnitas técnicas antes del diseño. La spec llegó **sin
NEEDS CLARIFICATION** (5 clarifs resueltas en `/speckit-clarify`); las decisiones de abajo son de
**implementación** sobre el stack ya fijado por el ADR `2026-06-07-stack-mentorcomercial` y la
constitución v1.0.0.

---

## R1 — Bridge de captura: WAHA, payload y eventos

**Decision:** usar **WAHA** (WhatsApp HTTP API) en Docker, configurado para postear **un webhook por
mensaje** a `POST /ingest/webhook`. Se consumen los eventos `message` / `message.any` y
`session.status`. La autenticación de la sesión es **exclusivamente** el número observador
(`tenants.ia_wa_jid`); nunca el de la líder.

**Rationale:**
- El bridge ya está elegido en el ADR; WAHA expone webhooks HTTP simples y maneja media (descarga por API).
- `session.status` permite detectar desconexión del bridge y **no quedar ciego** (edge case de la spec, FR-implícito de robustez).
- Validación **HMAC** del webhook (`X-Webhook-Hmac`) ya scaffoldeada en `webhook.py`.

**Alternatives considered:**
- **Evolution API** — equivalente funcional; se queda WAHA por coherencia con el ADR. Reevaluable si WAHA da problemas de estabilidad de sesión.
- **API oficial de WhatsApp** — descartada de raíz: **no soporta grupos** (riesgo nuclear del proyecto, ya documentado en S1).

**Riesgo abierto (rojo, heredado):** baneo del número observador. Mitigación: número dedicado/descartable, rol observador (casi no envía), warm-up. Fuera del alcance de código de F-001; es operativo.

---

## R2 — Cola durable: pgmq vs fallback tabla

**Decision:** **pgmq** sobre el mismo Postgres (cola `ai_processing`), ya creada en `0002_queue.sql`.
El worker consume con visibilidad/ack de pgmq; los jobs que fallan N veces van a **dead-letter** (no se pierden).

**Rationale:**
- Cero infra extra (corre en el Postgres que ya existe) — coherente con single-node F0.
- Cumple Principio IV (cola durable + idempotencia) sin sumar Redis/RabbitMQ.

**Alternatives considered:**
- **Tabla `processing_jobs` + `FOR UPDATE SKIP LOCKED`** — ya está como fallback comentado en `0002`. Se activa **solo si** la imagen de Postgres self-hosted no trae la extensión pgmq. Decisión operativa a verificar en el bootstrap del VPS (ver quickstart).
- **Redis/RabbitMQ** — descartado: infra extra innecesaria a esta escala.

**Acción para tasks:** verificar disponibilidad de `pgmq` en la imagen de Supabase self-hosted; si no está, activar el fallback (la lógica del worker debe abstraer la fuente de la cola para no acoplarse).

---

## R3 — Idempotencia e inmutabilidad de la captura

**Decision:** idempotencia por `unique(tenant_id, wa_message_id)` + `insert ... on conflict do nothing`.
Inmutabilidad: `messages` nunca se actualiza; **edición/borrado** en WhatsApp se registra como un
**nuevo registro de estado** asociado al `wa_message_id` original (no se sobrescribe).

**Rationale:** SC-002 (0 duplicados) y FR-017 (inmutable). El `raw jsonb` guarda el payload completo
como red de seguridad ante evolución del esquema.

**Alternatives considered:**
- **Mutar el registro con un campo `edited_at`/`deleted_at`** — rechazado: viola inmutabilidad y pierde el original (la spec exige conservar el original).
- **Modelar estados en `message_triage`** — `triage` es para estado de gestión (new/seen/...), no para el ciclo de vida WhatsApp (editado/borrado). Se modela en una tabla/append dedicada. Ver [data-model.md](./data-model.md) (entidad **MessageState**).

---

## R4 — Transcripción self-host (Whisper) y multi-idioma

**Decision:** **faster-whisper** self-host (`settings.whisper_model`, CPU por defecto, `int8`),
autodetección de idioma. El audio se descarga a Storage y se transcribe **dentro** del worker; el
archivo nunca sale a un tercero.

**Rationale:** Principio II (audio no sale) y FR-010 (es/en; Whisper autodetecta el idioma original
y lo guarda en `transcriptions.language`).

**Alternatives considered:**
- **whisper.cpp** — alternativa válida self-host; `faster-whisper` ya está scaffoldeado y es más simple de operar en Python.
- **API de transcripción de un tercero (OpenAI/Google)** — **prohibido** por constitución (el audio no puede salir).

**Constraint de performance:** sin GPU en el VPS, modelo `small` en CPU es viable para volumen
moderado del demo. Si la latencia molesta, bajar a `base`. No bloquea US1/US2.

---

## R5 — Extracción de eventos comerciales vía LiteLLM

**Decision:** clasificación + extracción en `app/services/ai.py` vía **LiteLLM** (Gemini Flash por
defecto, `settings.llm_model`). El prompt pide **JSON estricto** con el catálogo de la spec
(**venta | objeción | seguimiento | consulta**) y **devuelve las referencias a los mensajes de
origen**; por debajo de un umbral de `confidence` **no se crea evento** (preferir no extraer antes
que inventar, FR-009/US4-AC3).

**Rationale:** Principio V (desacople total del proveedor); Principio III (cada evento con su traza
en `event_sources`); FR-013/FR-014/FR-015.

**Alternatives considered:**
- **Llamar al SDK de Gemini directo** — **prohibido** (Principio V).
- **Reglas/keywords en vez de LLM** — insuficiente para objeciones/consultas matizadas en es/en; se usa LLM con umbral de confianza + revisión humana implícita (evento con `created_by='ai'` + `confidence`).

**Acción para tasks:** el prompt actual de `ai.py` usa un catálogo viejo (`reclamo/pago/...`). Debe
reescribirse al catálogo de la spec y separar **clasificación de triage** (importance/category, para
la actividad cruda) de **extracción de eventos** (los 4 tipos comerciales con traza).

---

## R6 — "Hoy" en zona fija ET y el dashboard

**Decision:** "hoy" se calcula como la ventana **ET 00:00–23:59** (`America/New_York`, con DST)
aplicada sobre `messages.wa_timestamp` (que es `timestamptz`, hora real del mensaje). La consulta del
dashboard filtra por esa ventana; **no** se usa la zona del cliente ni la del servidor.

**Rationale:** FR-018 y el edge case de la spec. `timestamptz` permite convertir a ET de forma
determinista en SQL (`wa_timestamp AT TIME ZONE 'America/New_York'`).

**Alternatives considered:**
- **UTC fijo** — rechazado: "hoy" se correría respecto del día comercial real en EE.UU.
- **Zona del navegador** — rechazado por FR-018 (zona fija del negocio, no del usuario).

---

## R7 — Búsqueda full-text bilingüe (es/en)

**Decision:** cambiar el índice FTS de `messages` de config `'spanish'` a **`'simple'`** para F-001
(sin stemming dependiente de idioma), suficiente para la búsqueda básica del demo. Dejar documentada
la opción de índices por idioma (es/en) para una feature posterior si el stemming aporta valor.

**Rationale:** FR-010 (es/en). Con `'spanish'`, el stemming castellano degrada el inglés. `'simple'`
es neutral y predecible para el alcance del demo (búsqueda exacta/parcial, no relevancia fina).

**Alternatives considered:**
- **Dos índices (`spanish` + `english`) + columna de idioma** — más preciso pero añade complejidad (hay que conocer el idioma del mensaje antes de indexar). YAGNI para F-001.
- **Búsqueda semántica (pgvector)** — fuera de alcance (F2). La tabla `message_embeddings` ya existe pero no se usa en F-001.

**Acción para tasks:** migración `0004` (o la misma que arregla el catálogo) recrea el índice FTS con `'simple'`.

---

## R8 — Acceso del frontend a los datos (RLS por JWT)

**Decision:** el frontend Next.js lee con el **cliente anon de Supabase** + sesión (JWT con
`app_metadata.tenant_id`); RLS filtra por `current_tenant_id()` (ya en `0003`). El backend FastAPI
escribe con **service_role** (bypassa RLS). El frontend **nunca** ve el service_role key.

**Rationale:** Principio II (RLS por defecto) + lección KB (`service_role` nunca en el frontend).
FR-009 (acceso restringido a la líder/perfiles autorizados).

**Alternatives considered:**
- **Exponer endpoints REST propios del backend para el dashboard** — válido, pero PostgREST + RLS de
  Supabase ya da lectura filtrada sin escribir endpoints; se reserva el backend para la ingesta/IA.
  El contrato `dashboard-api.md` documenta las vistas que el frontend consume.

---

## Resumen de acciones derivadas (entran en /speckit-tasks)

| # | Acción | US | Artefacto |
|---|---|---|---|
| A1 | Completar `capture.handle_message`: upsert contact/chat, insert message idempotente, media→Storage, triage, encolar | US1 | `capture.py` |
| A2 | Completar `worker.run`: consumir pgmq (o fallback) con ack + dead-letter + backoff | US1/US3/US4 | `worker.py` |
| A3 | Migración `0004`: alinear catálogo `commercial_events.type` a `venta/objeción/seguimiento/consulta` + recrear FTS `'simple'` | US4 | `0004_event_catalog.sql` |
| A4 | Modelar estado WhatsApp (editado/borrado) como append inmutable | US1 | `0004` o `0005` + data-model |
| A5 | Reescribir prompts de `ai.py`: triage vs extracción de eventos con traza + umbral de confianza | US4 | `ai.py` |
| A6 | Afinar `transcription.py` (ya funcional) + integrarlo al worker para `type='audio'` | US3 | `transcription.py`, `worker.py` |
| A7 | Vista "¿Qué pasó hoy?" mobile-first con ventana ET, sección cruda + eventos diferenciados, i18n es/en | US2/US4 | `frontend/app/.../hoy` |
| A8 | Verificar disponibilidad de pgmg en la imagen Postgres; fallback si no | US1 | infra |
| A9 | Tests: idempotencia (0 duplicados), captura completa (0 pérdidas), extracción sin falsos positivos | todas | `backend/tests/` |
