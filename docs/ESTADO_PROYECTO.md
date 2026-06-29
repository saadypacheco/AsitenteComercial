# Estado del Proyecto — Asistente Comercial (mentorcomercial)

**Interno.** Resumen completo para retomar en otra sesión. Última actualización: 2026-06-18.
Branch: `001-captura-whatsapp-bd` · Repo privado: `github.com/saadypacheco/mentorcomercial` (remote `private`).
**🟢 EN PRODUCCIÓN:** https://execally.online (ver §3b).

> **Novedades sesión 2026-06-18 (b):** (1) **Email real activo** — Resend configurado en prod, magic links/recuperación funcionan. (2) **Captura real afinada** — parsing NOWEB (tipo/nombre/número/filtro de ruido) + nombre de grupo (fix D). (3) **Landing de venta** pública bilingüe en `/Overview` (plantilla reutilizable). (4) **Asistente por Telegram** — ADR + spike (falta `TELEGRAM_BOT_TOKEN`). (5) **App del agente — Fase 1**: journey a la 1ª venta + gamificación (XP/nivel/misiones/logros) + **rediseño tema OSCURO estilo Empresa** (cyan/púrpura, glass) con toggle de acento. (6) **Análisis del onboarding enriquecido** ([ANALISIS_ONBOARDING.md](ANALISIS_ONBOARDING.md), de onboarding.md/onboarding2.md + mockups en `frontend/public/imagenes/`). (7) **Pool de conexiones** (perf, ~13s→1.5s).

---

## 1. Qué es
Plataforma para **Cecilia**, dueña de una agencia de servicios financieros (AIG / seguros de vida / retiro) que lidera **~2.000 agentes** y varios líderes. Mobile-first. Tres productos sobre **un backend/datos común**:
- **① Captura WhatsApp + IA** (bridge WAHA → captura → worker que clasifica y extrae eventos).
- **② Dashboard de gestión** (Cecilia + líderes): centro de control, pendientes, agentes, clientes, eventos, reportes.
- **③ Onboarding/Capacitación** (agentes + líderes): ruta de aprendizaje + app del agente.

Perfil, preocupaciones y preguntas de validación: ver [VALIDACION_CLIENTE.md](VALIDACION_CLIENTE.md). Guion de demo: [GUION_DEMO.md](GUION_DEMO.md).

## 2. Stack
- **Frontend:** Next.js 14 (App Router) + Tailwind. Bilingüe es/en (contexto de idioma compartido, persiste). Mobile-first.
- **Backend:** FastAPI (Python 3.12). Auth JWT self-contained (sin Supabase Auth). Acceso a datos por **psycopg directo** en local (decisión: no montar PostgREST/Auth de Supabase).
- **DB:** Postgres 15 (pgvector). Migraciones SQL en `backend/migrations/` + seeds en `infra/local-init/`.
- **Infra local:** `infra/docker-compose.local.yml` (db + backend + frontend + worker + waha).

## 3. Cómo correr
```
docker compose -f infra/docker-compose.local.yml up -d
```
| Servicio | URL |
|---|---|
| App | http://localhost:3002 |
| API | http://localhost:8002 (docs: /docs) |
| WAHA (bridge WhatsApp) | http://localhost:4500 (api key `local-dev-key`) |
| Postgres | localhost:54330 (postgres/postgres, db mentorcomercial) |

**Credenciales demo:**
- Dueña (ve todo): `cecilia@demo.com` / `demo1234`
- Líder (ve su equipo): `lider@demo.com` / `demo1234`
- Agente (app /agente): `maria@demo.com` (o juan/ana/luis/sofia@demo.com) → entra por magic link
- Otros agentes-emails: `juan/ana/luis/sofia@demo.com`

> Las migraciones nuevas se aplican solas en un volumen FRESCO. Sobre un volumen existente hay que aplicarlas a mano: `docker exec -e PGPASSWORD=postgres mc-local-db psql -U postgres -d mentorcomercial -f /migrations/00NN_*.sql` y los seeds en `/docker-entrypoint-initdb.d/`. Tras cambios de código del backend: `docker restart mc-local-backend`. El frontend tiene HMR (polling). Cambios de `docker-compose` requieren `up -d` (recrea), no `restart`.

## 3b. Producción (Hostinger) 🟢
Desplegado y funcionando (2026-06-18). Guías: [RUNBOOK_DEPLOY_HOSTINGER.md](RUNBOOK_DEPLOY_HOSTINGER.md) (genérico, reusable para otros repos), [DEPLOY_PRODUCCION.md](DEPLOY_PRODUCCION.md), [CONECTAR_WHATSAPP_WAHA.md](CONECTAR_WHATSAPP_WAHA.md).
- **URLs:** panel `https://execally.online` · API `https://api.execally.online`.
- **VPS:** Hostinger Ubuntu 24.04, IP `76.13.234.191`, proyecto en `/docker/mentorcomercial`. Reverse proxy **Traefik** (ya existente, red externa `traefik`) con **TLS Let's Encrypt automático** por labels. Convive con `solucionesdentales`/`amanda`.
- **DB:** **Supabase Cloud** (Pro, MICRO, us-east-2) vía **Session pooler** (IPv4 — el Direct connection es IPv6-only y no anda desde Docker). `DATABASE_URL` en `backend/.env`. Migraciones aplicadas; extensiones `vector` + `pgmq` habilitadas en el dashboard de Supabase.
- **WAHA:** número observador **vinculado** (sesión `default` WORKING). `tenants.ia_wa_jid='default'` (= nombre de sesión). Captura real andando. Compose `docker-compose.prod.yml` (mc-backend/worker/frontend/waha; sin Postgres local).
- **Login owner:** `saadypacheco@gmail.com` / `Cecilia2026` (reset por DB; cambiar). El email de recuperación se activa con Resend (ver §6).
- **Deploy/update:** `cd /docker/mentorcomercial && git pull && docker compose -f docker-compose.prod.yml --env-file .env up -d --build mc-backend mc-worker`.
- **Falta en prod:** `RESEND_API_KEY` (email real), `GEMINI_API_KEY` (IA real), HMAC del webhook (hoy `/ingest` público sin firma), swap, monitoreo.

## 4. Módulos construidos (panel de la líder)
Todos bilingües, responsive, con aislamiento por tenant y **scope multi-líder**.
- **/inicio** — Centro de Control: 5 KPIs (conversaciones, ventas $, críticos, clientes en riesgo, conectados), Recomendaciones IA, Estado del equipo (saturada/normal/excelente), Alertas enriquecidas, Top Agentes, Oportunidades ($/prob), Actividad, Preguntale a la IA. Buscador global destacado.
- **/acciones** — ⭐ "Asistente que actúa": acciones sugeridas con mensaje redactado → Aprobar y enviar / Aprobar todas (simulado; real con número/email).
- **/pendientes** — header ejecutivo, filtros, tarjetas (cliente/VIP/antigüedad/responsable), reasignar/escalar/cerrar, barra de progreso, panel IA Insights.
- **/clientes** — ⭐ cartera: stats (por renovar/sin seguimiento/cartera $), filtros, flags (renovación/sin contacto/cross-sell vida→retiro), registrar contacto, CRUD.
- **/agentes** — mapa (Leaflet) + jerarquía (árbol) + lista; carga por agente; CRUD; **designar líder** (owner).
- **/reuniones** — ⭐ procesa transcripción → resumen + temas + acciones → crea pendientes asignados.
- **/grupos** — actividad de chats (de la captura).
- **/eventos** — eventos comerciales (tipo/estado/nivel/$/prob) + acciones de estado.
- **/capacitaciones** — programa: barra de progreso, stepper de etapas, calendario (Zoom), progreso por agente, alertas, notificaciones, chat de ayuda.
- **/mensajes** — feed de captura + filtros + búsqueda.
- **/reportes** — gráficos (actividad, ventas por agente, eventos por tipo, pipeline).
- **/ia-insights** — recomendaciones, resumen, riesgo de clientes, saturados, oportunidades, ⭐ **agentes en riesgo de abandono** (cruce actividad+onboarding+producción, score 0-100, nivel alto/medio) y chat.
- **/ajustes** — perfil, idioma, estado de IA, ⭐ **briefing diario por WhatsApp** (número, hora, on/off, vista previa y "enviar prueba"), logout.

## 5. App del agente (Producto ③) — mobile
`/agente/login` (magic link por celular/email) → `/agente`: tabs **Hoy · Agenda (Zoom) · Ruta · Progreso · Logros** + chat de Ayuda (FAB). Score strip, ruta de etapas con "avanzar", ranking del grupo.

## 6. Integraciones
- **WhatsApp / WAHA:** ✅ **conectado en prod** (número observador vinculado). Webhook `/ingest/webhook` captura (PsycopgRepo) + worker procesa (clasifica + extrae eventos, determinista). **Parsing NOWEB real** (`models/waha.py`): detecta tipo desde `_data.message` (audio/video/img/texto), toma `pushName` (nombre del remitente) y el **número real** (no el `@lid`), y **filtra ruido** (estados `status@broadcast` + mensajes de protocolo). **Nombre del grupo** (fix D): el worker lo pide a WAHA (`get_group_name`) una vez por grupo y lo guarda en `chats.name`. **Falta:** transcripción de audios (Whisper, fix E).
- **Email (Resend/SMTP):** ✅ `services/email.py` con proveedor intercambiable — `'resend'` (HTTP API) | `'smtp'` (Gmail/app password) | `''` (modo log). Engancha los magic links (dueña en `auth.py`, agente en `agente.py`, "primero mail"). **Falta:** `RESEND_API_KEY` + `EMAIL_PROVIDER=resend` en prod.
- **Zoom asistencia:** `services/zoom.py` (Server-to-Server OAuth + Reports API) + endpoint `sync-asistencia` (real/simulado). **Falta:** cuenta Zoom Pro + 3 credenciales en `.env`.
- **Zoom reuniones:** `services/meeting.py` procesa transcripción (determinista; Gemini-ready). **Falta:** bajar transcript real de Cloud Recording.
- **IA (Gemini):** `services/ai.py` + fallback determinista en bullets/acciones/reuniones. **Falta:** `GEMINI_API_KEY` en `backend/.env` (→ Ajustes muestra "IA real activa").

## 4b. Roles y experiencias (quién ve qué)
Tres roles sobre el MISMO backend:
- **Cecilia (dueña / owner):** ve TODO (scope null). Es el panel completo (§4).
- **Líder:** **mismo panel que Cecilia, acotado a su equipo** (sub-árbol, vía multi-líder §7). NO es una app aparte hoy — es el mismo dashboard con scope. *Decisión abierta: si el líder necesita vistas/onboarding propios.*
- **Agente:** app mobile separada `/agente` (magic link), con su ruta de onboarding/capacitación (§5).

**Onboarding:** ✅ del **agente** (ruta de etapas en /agente). ❌ del **líder** (no construido — gap). El de Cecilia/owner no aplica (es la dueña).

## 7. Multi-líder
`app_users.agente_id` ancla a un líder a un nodo; JWT lleva `scope`; `view_ctx` + CTE recursiva resuelven el sub-árbol. Owner (scope null) ve todo. **Lecturas y escrituras** acotadas (Agentes, Pendientes, Inicio/command, Acciones, Capacitación, Clientes). El owner designa líderes desde Agentes. Chip "👥 Tu equipo".

## 8. Migraciones (backend/migrations/)
0001 init · 0002 queue · 0003 rls · 0004 event_catalog · 0005 daily_views · 0006 gestion_core (agentes/pendientes/capacitaciones) · 0007 executive · 0008 auth+tenant · 0009 executive_i18n · 0010 seed_i18n · 0011 agentes_geo · 0012 command_center · 0013 capacitacion_ruta · 0014 capacitacion_zoom · 0015 acciones · 0016 multilider · 0017 reuniones · 0018 clientes · 0019 briefing.

## 9. Tests
`backend/tests/` — **22 tests verde** (captura/idempotencia, auth JWT/magic/hash, processing reglas US4, command _delta, **parsing WAHA NOWEB** `test_waha_noweb.py`). Correr: `docker exec mc-local-backend sh -c "pip install -q pytest pytest-asyncio; cd /app && python -m pytest -q"`.

> **Perf:** el API usa un **pool de conexiones** (`app/db/pool.py`, psycopg_pool) — crítico contra Supabase Cloud (sin pool, cada query abría una conexión nueva → el dashboard tardaba ~13s; con pool ~1-1.5s).

## 10. PENDIENTE (para próximas sesiones)
**Depende de terceros (input de Cecilia):**
- ✅ ~~Número de WhatsApp descartable~~ — **conectado** (observador vinculado en prod).
- 🔴 **WFG**: formato de la data de producción/ventas (API/export) → para "agente consolidado estancado" + cartera real. (Hoy KPIs de ventas = demo/proxy.)
- 🔴 **Planilla real de los ~2.000 agentes** (importador CSV).
- 🔴 **Cuenta Zoom Pro** + Server-to-Server OAuth (asistencia + transcripts).
- 🔴 **Número WhatsApp personal de Cecilia** (destinatario del briefing).
- **Claves:** ✅ ~~RESEND_API_KEY~~ (email **activo** en prod) · `GEMINI_API_KEY` (IA real, hoy fallback determinista) · `TELEGRAM_BOT_TOKEN` (activar el asistente).

**Roles / experiencias (a definir — ver §4b):**
- **Dashboard del líder:** hoy es el MISMO panel que el de Cecilia, *acotado por scope* (multi-líder). Falta decidir si el líder necesita vistas/experiencia propias.
- **Onboarding del agente:** ✅ existe + **Fase 1 hecha** (journey a la 1ª venta + gamificación + tema oscuro Empresa). **Falta Fases 2-4** (ver [ANALISIS_ONBOARDING.md](ANALISIS_ONBOARDING.md)): motor de reglas, RAG/coach IA, simulador IA + centro predictivo. Persistir XP/racha en tabla (hoy derivado). **Onboarding del LÍDER:** ❌ no construido — gap.
- **Asistente conversacional:** ✅ **decidido Telegram** (ADR `architect-kb/decisions/2026-06-18-asistente-telegram-mentorcomercial.md`) + spike (`services/telegram.py` + `assistant.py`). **Falta:** crear bot en BotFather → `TELEGRAM_BOT_TOKEN`, y Fase 2 (acciones + habilitación por líder, scope-aware).

**Arquitectura / performance (post-cierre):**
- 🟡 **Migración a Next.js Server Components** — eliminar el fetch cliente-a-FastAPI en favor de fetch server-side directo. Requiere migrar auth de localStorage+JWT a cookies httpOnly (el server necesita leer el token para hacer el fetch en el servidor). Beneficio: cero spinners, cero hydration errors, datos disponibles en el HTML inicial. Bloqueante: rediseño del flujo de auth. Ver conversación 2026-06-24.
- 🟡 **Stored Procedures para endpoints pesados** (`/dashboard/command`, `/dashboard/acciones`) — reemplazar las 10 queries paralelas (ThreadPoolExecutor) por una sola función PostgreSQL que devuelve JSON. Una round-trip en vez de 10, el query planner de Postgres optimiza internamente. Ver conversación 2026-06-24.
- 🟡 **SWR / React Query** — agregar cache en el cliente (30s TTL) para evitar refetch al navegar entre páginas. Cambio mínimo: envolver las funciones de `lib/queries/` con `useSWR`. Post-cierre.

**Features / mejoras técnicas:**
- **Importador CSV de agentes** (auto-match por celular con la captura).
- **US3 / fix E — transcripción de audios (Whisper)** (gancho en el worker; falta el motor).
- **Acciones reales** (hoy `/acciones` simulado → enviar de verdad por WhatsApp/email).
- KPIs de volumen/ventas siguen **tenant-wide** para líderes — acotar cuando se conecte WFG.
- "Modo demo" que resetee los datos sembrados antes de una presentación.
- Endurecimiento prod: HMAC webhook, restringir `/ingest`, swap, monitoreo/alertas, backup del volumen `waha_sessions`.
- ✅ **Briefing diario por WhatsApp** (Feature E previa) — `services/briefing.py` + `tick` en worker + `api/briefing.py` + UI /ajustes. Migración 0019.
- ✅ **Detección de estancamiento/abandono** — `/dashboard/riesgo-agentes` + bloque /ia-insights + acción "reconectar". Seed `11_seed_riesgo.sql`.

## 11. Punteros clave
- Backend API: `backend/app/api/` (auth, command, gestion, agente, reuniones, dashboard, webhook, briefing).
- Servicios: `backend/app/services/` (capture, worker, processing, zoom, meeting, ai, queue, transcription, briefing, waha, email).
- DB/pool: `backend/app/db/` (pool, repository, session). Parsing WAHA: `backend/app/models/waha.py`.
- Frontend páginas: `frontend/app/(dashboard)/*` y `frontend/app/agente/*`.
- i18n: `frontend/lib/i18n/{es,en}.ts`.
- **Deploy/prod:** `docker-compose.prod.yml`, [RUNBOOK_DEPLOY_HOSTINGER.md](RUNBOOK_DEPLOY_HOSTINGER.md), [DEPLOY_PRODUCCION.md](DEPLOY_PRODUCCION.md), [CONECTAR_WHATSAPP_WAHA.md](CONECTAR_WHATSAPP_WAHA.md).
- Análisis de cliente: [VALIDACION_CLIENTE.md](VALIDACION_CLIENTE.md). Demo: [GUION_DEMO.md](GUION_DEMO.md). Journey metodología: [architect-journey.md](architect-journey.md).
