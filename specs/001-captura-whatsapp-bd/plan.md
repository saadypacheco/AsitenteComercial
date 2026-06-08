# Implementation Plan: Captura WhatsApp → BD + transcripción + dashboard "¿Qué pasó hoy?"

**Branch**: `001-captura-whatsapp-bd` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-captura-whatsapp-bd/spec.md`

## Summary

F-001 es el primer corte demostrable (F0-demo) de la plataforma: capturar de forma **fiable e
idempotente** todo lo que pasa en 1-2 grupos/chats de WhatsApp a través de un **número observador
dedicado** (nunca el de la líder), persistirlo como memoria comercial inmutable, **transcribir los
audios** (Whisper self-host), y exponer una vista mobile-first **"¿Qué pasó hoy?"** que combina la
actividad cruda del día con **eventos comerciales** (venta, objeción, seguimiento, consulta)
extraídos por IA, cada uno **trazable a su mensaje de origen**.

**Enfoque técnico:** webhook FastAPI recibe los eventos del bridge WAHA → persiste el mensaje crudo
(idempotente por `wa_message_id`) → encola un job en una **cola durable** (pgmq) → un worker async
transcribe (Whisper self-host), clasifica y extrae eventos vía **LiteLLM** (Gemini Flash,
intercambiable) → el frontend Next.js lee de Supabase (Postgres + RLS) y arma el dashboard.

**Faseo (decisión 2026-06-07):** entrega **incremental por prioridad** (slices verticales):
1. **US1 (P1)** — captura fiable: `MVP demostrable inicia acá`.
2. **US2 (P1)** — "¿qué pasó hoy?" crudo. **← MVP P1 completo.**
3. **US3 (P2)** — transcripción de audios.
4. **US4 (P2)** — eventos comerciales + trazabilidad.

El plan diseña **todo** F-001; el orden de tasks prioriza P1 para que entregue valor primero.

## Technical Context

**Language/Version**: Python 3.11 (backend/worker) · TypeScript 5.5 / Node 20 (frontend) · SQL (Postgres 15)

**Primary Dependencies**: FastAPI · Supabase Python client + `supabase-js` · `litellm` (gateway LLM) ·
`faster-whisper` (transcripción self-host) · `pgmq` (cola durable) · `structlog` (logs estructurados) ·
Next.js 14 (App Router) · Tailwind · Zustand · pgvector (presente para F2, no usado en F-001)

**Storage**: Supabase **self-hosted** — Postgres 15 (datos + RLS) + Supabase Storage (media: audio/imagen/doc)

**Testing**: `pytest` (backend: idempotencia, captura, extracción) · validación manual mobile (quickstart) ·
índice de duplicados verificado por SQL. (Sin requisito de unit tests de UI en F-001.)

**Target Platform**: Linux server (Hostinger + Docker, single-node en F0) · cliente: navegador móvil (PWA-ready)

**Project Type**: Web application (frontend Next.js + backend FastAPI + worker) sobre monorepo split
(`frontend/ + backend/ + infra/`)

**Performance Goals**: demo a escala chica (1-2 grupos). Captura debe absorber **picos** sin pérdida
(la cola durable desacopla; el procesamiento puede ir detrás). "¿Qué pasó hoy?" legible en **< 1 min**
(SC-003) — el dashboard consulta vistas indexadas, no recalcula en vivo.

**Constraints**:
- **NON-NEGOTIABLE I** — ninguna ruta de código usa credenciales del número de la líder; solo el número observador.
- **NON-NEGOTIABLE II** — toda tabla con RLS; LLM en modo no-retención vía gateway; audio nunca sale a terceros (Whisper self-host); datos en región EE.UU.
- Captura **inmutable**: lo capturado no se sobrescribe; edición/borrado = nuevo estado (FR-017).
- "Hoy" = ventana fija **ET 00:00–23:59** (FR-018), independiente de la zona de cada grupo.
- Multi-idioma **es/en** sin strings hardcodeados en UI (FR-010, Principio VI).

**Scale/Scope**: F-001 = 1 tenant, 1-2 grupos de prueba, 1 número observador. Esquema multi-tenant
(`tenant_id` + RLS) desde el día 1 para no hacer retrofit.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | ¿Cómo lo respeta F-001? | Verificación | Estado |
|---|---|---|---|
| **I. Número de la líder intocable** (NON-NEG) | La captura corre solo sobre el número observador (`tenants.ia_wa_jid`); el webhook y el bridge WAHA jamás autentican con el número de la líder. | Ninguna credencial/sesión de captura corresponde al número de la líder (SC-005). Test de contrato del webhook valida que la `session` recibida = la dedicada. | ✅ PASS |
| **II. Privacidad y soberanía** (NON-NEG) | RLS activo en toda tabla nueva (0003); LLM vía gateway LiteLLM con cabeceras no-retención; transcripción **self-host** (audio no sale); datos en Hostinger EE.UU. | Toda tabla nace con RLS (verificable en migración); no hay imports de SDK de proveedor en handlers; ningún audio se postea a API externa. | ✅ PASS |
| **III. Trazabilidad total** | Cada `commercial_events` enlaza ≥1 `messages` vía `event_sources` (N:M); cada `transcriptions` referencia su `message`. La UI no muestra evento sin traza (FR-014). | SC-007: 100% de eventos con origen. SC-006: 100% transcripciones rastreables. | ✅ PASS |
| **IV. Robustez por arquitectura** | Cola durable (pgmq) entre webhook y worker; idempotencia por `unique(tenant_id, wa_message_id)`; logs estructurados (structlog); dead-letter en el worker. | SC-001 (0 pérdidas), SC-002 (0 duplicados). Reintento no duplica. | ✅ PASS |
| **V. LLM desacoplado** | Toda clasificación/extracción pasa por `app/services/ai.py` → `litellm`. Cambiar de proveedor = tocar `settings.llm_model`. | No hay `import google.generativeai`/`openai`/`anthropic` en handlers de negocio. | ✅ PASS |
| **VI. Mobile-first y multi-idioma** | "¿Qué pasó hoy?" diseñada mobile-first (reusa prototipo de `mockups/`); UI con i18n es/en; transcripción multi-idioma (Whisper autodetecta). | FR-008, FR-010; sin texto visible fuera de i18n; validado en viewport móvil (quickstart). | ✅ PASS |

**Resultado del gate:** ✅ **PASS sin violaciones.** `Complexity Tracking` queda vacío.

**Reconciliaciones que el diseño debe aplicar** (no son violaciones, son deuda del scaffold previo a la spec):
1. **n8n fuera de F-001.** `docs/ARQUITECTURA.md` (§2/§4) describe la ingesta vía n8n; el ADR `2026-06-07-stack-mentorcomercial` la reemplazó por el **webhook FastAPI** (ya scaffoldeado). El plan usa FastAPI; n8n no entra en F-001.
2. **Catálogo de `commercial_events.type`.** La migración `0001_init.sql` trae `('oportunidad','renovacion','reclamo','seguimiento','capacitacion','tarea','consulta')`, pero la spec clarificada fija **`venta, objeción, seguimiento, consulta`** (FR-013). Requiere migración `0004` que alinee el `check`. Ver [data-model.md](./data-model.md).
3. **FTS bilingüe.** El índice FTS de `messages` usa config `'spanish'` fija; con es/en (FR-010) conviene `'simple'` (sin stemming por idioma) o un índice por idioma. Ver [research.md](./research.md).

## Project Structure

### Documentation (this feature)

```text
specs/001-captura-whatsapp-bd/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Fase 0 — decisiones técnicas
├── data-model.md        # Fase 1 — entidades ↔ esquema + reconciliaciones
├── quickstart.md        # Fase 1 — guía de validación end-to-end
├── contracts/           # Fase 1 — contratos de interfaz
│   ├── webhook-waha.md       # bridge → POST /ingest/webhook
│   └── dashboard-api.md      # vistas/endpoints que consume el frontend
└── tasks.md             # Fase 2 (/speckit-tasks — NO lo crea este comando)
```

### Source Code (repository root)

El repo ya está scaffoldeado (bootstrap S2). F-001 **completa** los placeholders, no crea estructura nueva.

```text
backend/
├── app/
│   ├── main.py                  # FastAPI app (existe)
│   ├── api/
│   │   ├── webhook.py           # POST /ingest/webhook (existe; completar US1)
│   │   └── health.py            # (existe)
│   ├── services/
│   │   ├── capture.py           # persistencia idempotente (US1) ← completar
│   │   ├── worker.py            # loop pgmq + dead-letter (US1/US3/US4) ← completar
│   │   ├── transcription.py     # faster-whisper (US3) (existe, afinar)
│   │   └── ai.py                # LiteLLM: clasificar + extraer eventos (US4) ← completar
│   ├── db/session.py            # cliente Supabase service_role (existe)
│   ├── core/config.py           # settings (existe; añadir TZ negocio si hace falta)
│   └── models/                  # (vacío) — schemas Pydantic de payloads/DTOs ← crear
├── migrations/
│   ├── 0001_init.sql            # esquema base (existe)
│   ├── 0002_queue.sql           # pgmq (existe)
│   ├── 0003_rls.sql             # RLS (existe)
│   └── 0004_event_catalog.sql   # ← NUEVO: alinear catálogo de eventos a la spec
└── tests/                       # ← crear: idempotencia, captura, extracción

frontend/
├── app/
│   ├── (dashboard)/hoy/         # "¿Qué pasó hoy?" (US2/US4) ← crear
│   └── ...
├── lib/supabase.ts              # cliente anon + sesión (RLS por JWT) ← crear
├── lib/i18n/                    # es/en (FR-010) ← crear
└── package.json                 # (existe)

infra/
└── docker-compose.yml           # waha + postgres + backend + worker + frontend (existe; añadir whisper si aplica)
```

**Structure Decision**: Web application (Opción 2) sobre el monorepo split ya existente
(`frontend/ + backend/ + infra/`). F-001 trabaja sobre `backend/app/services/*` (captura, worker,
transcripción, IA), una migración nueva `0004`, y una ruta nueva `frontend/app/.../hoy`. No se
introduce n8n ni servicios nuevos respecto del scaffold.

## Complexity Tracking

> Sin entradas — Constitution Check pasó sin violaciones. La arquitectura (cola durable, RLS,
> gateway LLM, transcripción self-host) está mandada por la constitución, no es complejidad añadida
> por encima de ella.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
