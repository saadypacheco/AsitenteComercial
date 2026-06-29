---
description: "Task list — F-001 Captura WhatsApp → BD + transcripción + dashboard"
---

# Tasks: Captura WhatsApp → BD + transcripción + dashboard "¿Qué pasó hoy?"

**Input**: Design documents from `specs/001-captura-whatsapp-bd/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (todos presentes)

**Tests**: incluidos **solo** para los invariantes críticos con Success Criteria medibles
(idempotencia/0 duplicados, 0 pérdidas, sin falsos positivos en eventos). No hay TDD de UI.

**Organization**: tareas agrupadas por user story, en orden de prioridad (P1 → P2). Faseo
**incremental**: el MVP demostrable se cierra al terminar US1 + US2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (archivo distinto, sin dependencias pendientes)
- **[Story]**: US1..US4 (mapea a las user stories de spec.md)
- Rutas exactas en cada descripción

## Path Conventions

Web app sobre monorepo split ya scaffoldeado: `backend/app/`, `backend/migrations/`,
`backend/tests/`, `frontend/`, `infra/`. El repo NO se crea de cero; F-001 completa placeholders.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dejar el entorno listo para correr backend, worker, frontend e infra.

- [~] T001 Verificar/instalar dependencias backend en `backend/pyproject.toml` (FastAPI, supabase, litellm, faster-whisper, structlog, pydantic-settings, **psycopg añadido**) — PARCIAL: deps declaradas + light deps instaladas para tests; falta `uv sync` del entorno completo en el VPS
- [ ] T002 [P] Verificar/instalar dependencias frontend en `frontend/package.json` (next, @supabase/supabase-js, zustand, tailwind) con `npm install`
- [ ] T003 [P] Completar `backend/.env` e `infra/.env` desde los `.env.example` (DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WAHA_BASE_URL, WAHA_API_KEY, WEBHOOK_SECRET, LLM_MODEL, GEMINI_API_KEY, WHISPER_MODEL)
- [X] T004 [P] Configurar lint/format backend (ruff) y frontend (next lint) y un `pytest` runnable vacío en `backend/tests/` — pytest corriendo (5/5 verde); ruff/next-lint ya declarados en pyproject/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: esquema de BD, cola, RLS y tenant — todo lo que CUALQUIER user story necesita.

**⚠️ CRITICAL**: ninguna user story puede empezar hasta terminar esta fase.

- [ ] T005 Levantar la infra con `docker compose -f infra/docker-compose.yml up -d` (Postgres/Supabase + WAHA + backend + worker + frontend) y validar que `backend` responde en `/health` (puerto 8002)
- [ ] T006 Aplicar migraciones `backend/migrations/0001_init.sql`, `0002_queue.sql`, `0003_rls.sql` en orden contra el Postgres self-hosted
- [X] T007 Crear `backend/migrations/0004_event_catalog.sql` con: (a) `drop/add constraint` para alinear `commercial_events.type` a `('venta','objecion','seguimiento','consulta')`; (b) recrear el índice FTS de `messages` con config `'simple'`; (c) tabla `message_states` (FR-017) + índice; (d) habilitar RLS + policy de lectura por `tenant_id` en `message_states`. Ver [data-model.md](./data-model.md) §"Migración 0004"
- [ ] T008 Aplicar `0004_event_catalog.sql` y verificar (`\d commercial_events`, `\d message_states`, índices FTS)
- [ ] T009 Verificar disponibilidad de `pgmq` (`select * from pgmq.list_queues();`); si NO está, activar el fallback de tabla `processing_jobs` de `0002_queue.sql` (ver [research.md](./research.md) R2)
- [ ] T010 Registrar el tenant de prueba: insertar en `tenants` con `ia_wa_jid` = JID del **número observador dedicado** (NUNCA el de la líder — Principio I)
- [X] T011 [P] Crear módulo de configuración de zona "hoy" ET en `backend/app/core/config.py` (`business_tz`) + helper `backend/app/core/timewindow.py` para la ventana del día (FR-018, R6)
- [X] T012 [P] Crear `frontend/lib/supabase.ts` (cliente anon + sesión JWT con `app_metadata.tenant_id`; el frontend NUNCA recibe el service_role — lección KB)
- [X] T013 [P] Crear scaffolding i18n es/en en `frontend/lib/i18n/` (sin strings de UI hardcodeados — Principio VI, FR-010)

**Checkpoint**: esquema + cola + RLS + tenant listos. Pueden empezar las user stories.

---

## Phase 3: User Story 1 — Nada de lo que pasa en WhatsApp se pierde (Priority: P1) 🎯 MVP

**Goal**: capturar de forma fiable e idempotente todo mensaje de los grupos/chats del número
observador, persistirlo inmutable, sin pérdidas ni duplicados, sin tocar el número de la líder.

**Independent Test**: con el observador en un grupo de prueba, enviar varios mensajes desde distintos
participantes y verificar que cada uno queda con remitente, grupo, fecha-hora y contenido, sin
pérdidas ni duplicados (quickstart §US1).

### Tests for User Story 1 ⚠️ (escribir primero, deben FALLAR)

- [X] T014 [P] [US1] Test de idempotencia en `backend/tests/test_idempotency.py`: insertar el mismo `wa_message_id` dos veces → 1 sola fila (SC-002) — ✅ pasa
- [X] T015 [P] [US1] Test de captura completa en `backend/tests/test_capture.py`: un payload WAHA produce 1 `messages` + `message_triage(status='new')` + 1 job encolado, con `raw` = payload completo (SC-001) — ✅ pasa
- [X] T016 [P] [US1] Test Principio I en `backend/tests/test_capture.py`: un evento cuya `session` ≠ `tenants.ia_wa_jid` se ignora y no persiste (SC-005) — ✅ pasa (+ test extra FR-017 inmutabilidad)

### Implementation for User Story 1

- [X] T017 [P] [US1] Crear modelos Pydantic del payload WAHA en `backend/app/models/waha.py` (campos mínimos del contrato: id, from, participant, type, body, timestamp, hasMedia, mimeType, quotedMsgId)
- [X] T018 [US1] En `backend/app/api/webhook.py`: validar que `event.session` corresponde al número observador del tenant; ignorar+loguear si no (Principio I), y devolver 400 si falta `payload.id`. Ver [contracts/webhook-waha.md](./contracts/webhook-waha.md)
- [X] T019 [US1] Implementar `capture.handle_message` en `backend/app/services/capture.py` (+ capa `backend/app/db/repository.py`): resolver tenant, `upsert` `contacts`/`chats`, `insert messages ... on conflict do nothing` con `raw` completo, `insert message_triage(status='new')`
- [X] T020 [US1] En `capture.handle_message`: registrar metadata de media en `media` para `type` no-texto/no-audio (imagen/doc/sticker/ubicación) sin analizar contenido (FR-016)
- [X] T021 [US1] Encolar job en `ai_processing` (pgmq o fallback `processing_jobs`) con el `message_id`, **después** de persistir el mensaje (durabilidad SC-001) — `capture.py` + `backend/app/services/queue.py`
- [X] T022 [US1] Manejar eventos de **edición/borrado** de WAHA en `webhook.py`/`capture.py`: NO mutar `messages`; insertar en `message_states` (`edited`/`deleted`) con `raw` del evento (FR-017)
- [X] T023 [US1] Implementar el loop base del worker en `backend/app/services/worker.py`: consumir la cola con visibilidad/ack, **dead-letter** tras N reintentos y backoff; logs estructurados (Principio IV). En US1 el job loguea; transcripción/extracción enganchan en US3/US4
- [X] T024 [US1] Manejar `session.status` desconectado en `webhook.py`: log de alerta (nivel error si disconnected/failed/stopped) de salud del bridge (no quedar ciego — edge case)

**Checkpoint**: US1 código completo, tests verde. Falta validación E2E contra infra viva (T005–T010).

---

## Phase 4: User Story 2 — "¿Qué pasó hoy?" en un vistazo (Priority: P1) 🎯 MVP

**Goal**: pantalla mobile-first que resume la actividad capturada del día (ventana ET) y permite
navegar al detalle de un grupo.

**Independent Test**: con datos capturados de hoy, abrir el dashboard en celular y entender el pulso
del día en < 1 min, navegando al detalle de un grupo (quickstart §US2).

### Implementation for User Story 2

- [X] T025 [P] [US2] Capa de lectura "resumen del día" en `frontend/lib/queries/daily.ts` (RPC `daily_summary`) + **migración `0005_daily_views.sql`** (funciones `business_day_bounds`/`daily_summary`/`daily_chat_detail`, ventana ET server-side, SECURITY INVOKER → RLS). Ver [contracts/dashboard-api.md](./contracts/dashboard-api.md) §1 (FR-007, FR-018)
- [X] T026 [P] [US2] Consulta de detalle de chat en `frontend/lib/queries/chatDetail.ts` (RPC `daily_chat_detail`) (contrato §2)
- [X] T027 [US2] Página "¿Qué pasó hoy?" mobile-first en `frontend/app/(dashboard)/hoy/page.tsx`: volumen, actividad por grupo (tappable), lo más reciente; i18n es/en con toggle (FR-008, FR-010) + andamiaje Next (tsconfig/next.config/tailwind/postcss/layout/globals)
- [X] T028 [US2] Vista de detalle de grupo en `frontend/app/(dashboard)/hoy/[chatId]/page.tsx` (incluye placeholders de transcripción US3 y media FR-016)
- [X] T029 [US2] Estado vacío claro (`vacio` → mensaje, no error) en ambas páginas; layout `viewport` mobile-first (edge case, FR-008)

**Checkpoint**: US1 + US2 código completo → **MVP P1**. Falta `npm install` + `dev` y validación en viewport real (T002, T005–T010, con datos sembrados).

---

## Phase 5: User Story 3 — Los audios también se leen (Priority: P2)

**Goal**: transcribir self-host (Whisper) los audios capturados, en su idioma original, trazables al
audio de origen.

**Independent Test**: enviar una nota de voz al grupo; verificar que aparece su transcripción en
texto, en el idioma original, con link al audio original (quickstart §US3).

### Tests for User Story 3 ⚠️

- [ ] T030 [P] [US3] Test de trazabilidad de transcripción en `backend/tests/test_transcription.py`: toda fila de `transcriptions` referencia un `messages` tipo audio (SC-006)

### Implementation for User Story 3

- [ ] T031 [US3] Descargar el audio del bridge a Supabase Storage en el worker y marcar `media.downloaded` en `backend/app/services/worker.py`/`capture.py` (prerequisito de la transcripción y del link al original)
- [ ] T032 [US3] Integrar `transcription.transcribe` en el worker para `messages.type='audio'`: insertar en `transcriptions` con `text`, `language` (autodetectado por Whisper — multi-idioma, NO fijar 'es'), `engine`, `confidence` (FR-005, FR-010) en `backend/app/services/worker.py`
- [ ] T033 [US3] Manejar audio en idioma no soportado/ininteligible sin romper el flujo: el mensaje queda registrado, transcripción vacía/no utilizable (edge case)
- [ ] T034 [P] [US3] Mostrar la transcripción en el detalle del mensaje y ofrecer el **audio original** vía signed URL de Storage (trazabilidad US3-AC3) en `frontend/app/(dashboard)/hoy/[chatId]/page.tsx`

**Checkpoint**: audios transcritos y trazables, además de US1+US2.

---

## Phase 6: User Story 4 — Los eventos comerciales del día, con evidencia (Priority: P2)

**Goal**: extraer por IA eventos comerciales (venta/objeción/seguimiento/consulta) de los mensajes y
transcripciones, cada uno trazable a su mensaje de origen, diferenciando hecho de inferencia.

**Independent Test**: con mensajes que contengan una venta y una objeción claras, verificar que
aparecen como eventos del tipo correcto, cada uno con link al mensaje origen, sin falsos positivos
(quickstart §US4).

### Tests for User Story 4 ⚠️

- [ ] T035 [P] [US4] Test de extracción en `backend/tests/test_events.py`: sobre un set fijo con venta+objeción se crean eventos del tipo correcto y un mensaje trivial NO crea evento (SC-008)
- [ ] T036 [P] [US4] Test de trazabilidad de evento en `backend/tests/test_events.py`: todo `commercial_events` tiene ≥1 `event_sources` (SC-007)

### Implementation for User Story 4

- [ ] T037 [US4] Reescribir los prompts de `backend/app/services/ai.py`: separar **triage** (importance/category para la actividad cruda) de **extracción de eventos** (catálogo `venta/objecion/seguimiento/consulta`, JSON estricto, refs a mensajes de origen, umbral de confianza). Todo vía LiteLLM (Principio V). Ver [research.md](./research.md) R5
- [ ] T038 [US4] En el worker: por cada job, llamar a extracción; si `confidence ≥ umbral`, `insert commercial_events` + `insert event_sources` en la **misma transacción**; bajo el umbral, NO crear evento (FR-013, FR-014, US4-AC3) en `backend/app/services/worker.py`
- [ ] T039 [P] [US4] Crear consulta de eventos del día en `frontend/lib/queries/events.ts`: `commercial_events` de hoy (ventana ET) con sus `event_sources → messages` (contrato §3)
- [ ] T040 [US4] Agregar la sección "eventos comerciales" a `frontend/app/(dashboard)/hoy/page.tsx`, **diferenciada visualmente** de la actividad cruda (hecho vs inferencia, FR-015), con labels i18n por tipo; abrir un evento muestra su(s) mensaje(s) de origen (FR-014) (depende de T039)

**Checkpoint**: las 4 user stories funcionan independientemente. F-001 completo.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: cierre de calidad transversal.

- [ ] T041 [P] Revisar logs estructurados (structlog) en los puntos críticos (ingesta, transcripción, extracción) — observabilidad (Principio IV)
- [ ] T042 [P] Reconciliar `docs/ARQUITECTURA.md` §2/§4: la ingesta de F-001 es el webhook FastAPI, no n8n (nota/aclaración; el ADR ya lo decidió)
- [ ] T043 [P] Actualizar `docs/bitacora-sdd.md` con el avance de F-001 (plan + tasks)
- [ ] T044 Ejecutar la validación completa de [quickstart.md](./quickstart.md) (US1→US4) sobre los grupos de prueba reales
- [ ] T045 Verificar criterios de seguridad: RLS niega por defecto, media por signed URL, sin service_role en el frontend, número de la líder intacto (SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. **BLOQUEA** todas las user stories (esquema, cola, RLS, tenant).
- **User Stories (Phase 3-6)**: dependen de Foundational. Orden de entrega P1 → P2 (faseo incremental).
- **Polish (Phase 7)**: depende de las user stories deseadas completas.

### User Story Dependencies

- **US1 (P1)**: arranca tras Foundational. Sin dependencias de otras stories. Es la base de captura.
- **US2 (P1)**: arranca tras Foundational. Lee lo que US1 captura; testeable sola con datos sembrados.
- **US3 (P2)**: arranca tras Foundational. Consume el worker de US1 (T023) para procesar audios.
- **US4 (P2)**: arranca tras Foundational. Consume el worker de US1; mejor con US3 lista (usa transcripciones), pero testeable sola con mensajes de texto.

### Within Each User Story

- Tests (donde existen) primero y deben fallar.
- Modelos → servicios → endpoints/UI → integración.
- Worker base (T023) antes de transcripción (T032) y extracción (T038), porque ambas cuelgan del worker.

### Parallel Opportunities

- Setup: T002, T003, T004 en paralelo.
- Foundational: T011, T012, T013 en paralelo (backend TZ, cliente front, i18n) — tras T006/T008.
- US1: T014/T015/T016 (tests) en paralelo; T017 en paralelo con los tests.
- US2: T025 y T026 en paralelo.
- US4: T035/T036 (tests) y T039 (query) en paralelo.
- Polish: T041, T042, T043 en paralelo.

---

## Parallel Example: User Story 1

```bash
# Tests de US1 juntos (deben fallar antes de implementar):
Task: "Test de idempotencia en backend/tests/test_idempotency.py"
Task: "Test de captura completa en backend/tests/test_capture.py"
Task: "Test Principio I en backend/tests/test_capture.py"

# Modelo del payload en paralelo con los tests:
Task: "Modelos Pydantic del payload WAHA en backend/app/models/waha.py"
```

---

## Implementation Strategy

### MVP First (P1 = US1 + US2)

1. Completar Phase 1 (Setup) y Phase 2 (Foundational — CRÍTICO, bloquea todo).
2. Completar Phase 3 (US1 — captura fiable).
3. Completar Phase 4 (US2 — "¿Qué pasó hoy?" crudo).
4. **PARAR y VALIDAR**: el demo P1 ya muestra captura + dashboard sobre grupos reales.

### Incremental Delivery (P2)

5. Phase 5 (US3 — transcripción) → validar → demo.
6. Phase 6 (US4 — eventos comerciales) → validar → demo.
7. Phase 7 (Polish) → validación end-to-end (quickstart) + seguridad.

Cada story agrega valor sin romper las anteriores.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- La migración `0004` se mantiene como **un solo archivo** en Foundational (orden de migración importa); por eso T007/T008 no son [P] entre sí ni con T006.
- El worker es compartido por US1/US3/US4: respetar el orden T023 → T032 → T038 para no editar el mismo archivo en conflicto.
- Verificar que los tests fallan antes de implementar.
- Parar en cada checkpoint para validar la story de forma independiente.
- Constitución: Principios I y II (NON-NEGOTIABLE) se verifican en T016, T032 (audio self-host), T045.
