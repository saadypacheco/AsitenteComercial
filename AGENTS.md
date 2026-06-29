# AGENTS.md — mentorcomercial
> Stack: Next.js 14 · FastAPI · Supabase (self-hosted) · Gemini Flash vía LiteLLM · Whisper self-host · Bridge WhatsApp (WAHA)
> Última modificación: 2026-06-07
> Límite: 600 líneas. Detalle de arquitectura → `docs/ARQUITECTURA.md`. Decisiones → `architect-kb/decisions/2026-06-07-stack-mentorcomercial.md`

---

## 1. Visión del proyecto

Plataforma de **inteligencia comercial sobre WhatsApp** para una líder de ventas de
seguros (~2.000 agentes). La comunicación diaria vive en WhatsApp, sobre todo en
**grupos**. Un **número IA dedicado** (observador, no el de la líder) captura todo,
lo persiste, transcribe audios, extrae **eventos comerciales** estructurados con
trazabilidad, y expone una **memoria consultable** + dashboard.

**Diferencial:** convertir el caos de WhatsApp en una memoria comercial priorizada,
sin tocar el número/iPhone de la líder y sin pedirle cambiar su forma de trabajar.

**Audiencia:** líder + líderes intermedios (gestión) y agentes (en WhatsApp). Multi-idioma.
**Restricción dura:** no correr riesgo de baneo del número de la líder (bridge en número descartable).

---

## 2. Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | Next.js App Router + TypeScript | 14.x |
| Estilos | Tailwind CSS | 3.x |
| Estado cliente | Zustand | 4.x |
| Backend | FastAPI + Python | 3.12 / 0.111+ |
| Validación | Pydantic v2 | 2.x |
| Base de datos | Supabase **self-hosted** (Postgres 15 + Auth + Storage + Realtime) + pgvector | — |
| Captura WhatsApp | Bridge no oficial WAHA/Evolution (Docker, número IA dedicado) | — |
| Cola | pgmq (durable, sobre Postgres) | — |
| IA / LLM | Gemini 2.0 Flash **vía LiteLLM** (cambiable a cualquier proveedor) | — |
| Transcripción | faster-whisper **self-hosted** (multi-idioma) | — |
| Deploy | VPS **Hostinger + Docker** (mismo patrón que tienda/dentales) | — |

> Path dependence 🔴 mitigada: stack org elegido tras comparar alternativas (n8n, Edge, AI SDK).
> Gemelo arquitectónico: `solucionesdentales` (Next+FastAPI+Supabase+Gemini+WhatsApp+multi-tenant).

---

## 3. Arquitectura general

```
WhatsApp (grupos + reenvíos 1:1) → Número IA (observador)
   → Bridge WAHA (Docker) → webhook firmado → FastAPI (ingesta idempotente)
   → Postgres (raw + normalizado) + Storage (media)
   → cola durable (pgmq) → worker IA (Whisper + LiteLLM)
   → memoria comercial (eventos/tareas/oportunidades + trazabilidad)
   → Dashboard web  ·  (F1) Telegram = agente personal de la líder
```

Tres superficies con roles distintos (ver `docs/ARQUITECTURA.md` §2):
- **WhatsApp IA** = captura (entrada de datos).
- **Telegram** (F1) = agente personal de la líder (push + consultas NL + acciones).
- **Dashboard web** = análisis profundo.

---

## 4. Estructura de carpetas

```
MentorComercial/
├── AGENTS.md
├── README.md
├── docs/                      # arquitectura, discovery, presentación, journey
│   ├── ARQUITECTURA.md
│   ├── bitacora-sdd.md
│   ├── architect-journey.md   (interno, gitignored)
│   └── ...
├── frontend/                  # Next.js 14 (dashboard)
│   └── src/{app,lib,components}/
├── backend/                   # FastAPI
│   ├── app/{api,core,db,models,services}/
│   ├── migrations/            # 0001_init · 0002_queue · 0003_rls
│   ├── pyproject.toml · Dockerfile
├── infra/                     # docker-compose (waha + backend + worker)
└── mockups/                   # prototipo HTML navegable (referencia visual)
```

---

## 5. Módulos / fases

```
F0 — Captura WhatsApp → BD + transcripción + dashboard "¿Qué pasó hoy?"  (DEMO, 2 semanas)
F1 — Todos los grupos · eventos comerciales + trazabilidad · resúmenes · Telegram básico · reenvío 1:1
F2 — Consultas en lenguaje natural (RAG/LangGraph) · multi-tenant real · hardening · escalado bridges
F3 — Múltiples líderes · miles de agentes · orquestación de bridges
```

---

## 6. Modelo de datos

Esquema completo en `backend/migrations/0001_init.sql`. Tablas clave:

```
tenants · contacts · chats · chat_participants
messages (INMUTABLE, raw jsonb = fuente de verdad) · media · message_triage
transcriptions · clients · products
commercial_events · event_sources (N:M trazabilidad) · tasks · message_entities
message_embeddings (pgvector, F2)
```

Regla de oro: se filtra en la ENTREGA, nunca en la captura. Todo va a la BD con estado `new`.

---

## 7. Convenciones de código

Idénticas al patrón org (ver `solucionesdentales`/`tienda` AGENTS.md §7):
- **Frontend:** PascalCase componentes, `use` prefix hooks, Tailwind only, `'use client'` mínimo.
- **Backend:** snake_case rutas, schemas `NombreCreate/Update/Response`, `HTTPException` en español.
- **Git:** `feature/<slug>`, commits `feat(modulo): descripción`.

---

## 8. Variables de entorno

Ver `backend/.env.example`, `frontend/.env.example`, `infra/.env.example`.
Críticas: `SUPABASE_SERVICE_ROLE_KEY` (solo backend), `WAHA_API_KEY`, `WEBHOOK_SECRET`, `GEMINI_API_KEY`.

---

## 9. Reglas críticas

1. `SUPABASE_SERVICE_ROLE_KEY` **nunca** va al frontend (lesson KB).
2. **No tocar el número/iPhone de la líder.** El bridge corre en número IA descartable.
3. Bridge en **red privada**, nunca expuesto a internet. Webhook firmado (HMAC).
4. **RLS activo** en todas las tablas con `tenant_id` (multi-tenant).
5. `messages` es inmutable. Lo que la IA infiere va en tablas aparte con `confidence`.
6. **Idempotencia** por `wa_message_id` — los reintentos no duplican.
7. Media → Storage, nunca base64 en DB.
8. Transcripción **self-hosted** (audios no salen a terceros). LLM por API con no-retención.
9. LLM siempre vía **LiteLLM** — nunca hardcodear un proveedor.
10. **Multi-idioma**: prompts y UI no asumen idioma.
11. Cola **durable** entre captura y procesamiento — no perder mensajes.
12. Health-check del bridge + alerta si se desconecta (no quedar ciego).

---

## 10. Flujos críticos

### Captura
```
mensaje en grupo → bridge → POST /ingest/webhook (HMAC)
  → upsert contact + chat → insert message (idempotente) → media → triage('new')
  → encola job pgmq
```

### Procesamiento (worker)
```
job → ¿audio? transcripción (Whisper) → clasificación (LiteLLM)
  → extracción cliente/producto → ¿evento? commercial_events + event_sources
  → embedding (F2)
```

---

## 11. MVP — orden de implementación

```
F0 (demo, 2 semanas)
  1. Migraciones SQL (hecho: 0001/0002/0003)
  2. Bridge WAHA capturando 1-2 grupos de prueba → BD
  3. Ingesta real en /ingest/webhook (capture.handle_message)
  4. Transcripción de audios
  5. Dashboard "¿Qué pasó hoy?" + buscador (portar de mockups/)
```

---

## 12. Deploy — VPS Hostinger (mismo patrón que tienda/dentales)

```
backend  → contenedor en VPS, puerto 8002 (tienda=8000, dentales=8001)
worker   → contenedor aparte (consume pgmq)
waha     → contenedor, solo localhost, red privada
frontend → Vercel o self-host
Supabase → self-hosted (compose oficial), migraciones aplicadas con psql
```
