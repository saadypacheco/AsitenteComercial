# Estado del Proyecto — Asistente Comercial (mentorcomercial)

**Interno.** Resumen completo para retomar en otra sesión. Última actualización: 2026-06.
Branch: `001-captura-whatsapp-bd` · Repo privado: `github.com/saadypacheco/mentorcomercial` (remote `private`).

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

## 6. Integraciones (andamiadas + probadas en simulado)
- **WhatsApp / WAHA:** servicio WAHA en compose local; webhook `/ingest/webhook` captura (PsycopgRepo) + worker procesa (clasifica + extrae eventos, determinista). **Falta:** número descartable + setear `tenants.ia_wa_jid`.
- **Zoom asistencia:** `services/zoom.py` (Server-to-Server OAuth + Reports API) + endpoint `sync-asistencia` (real/simulado). **Falta:** cuenta Zoom Pro + 3 credenciales en `.env`.
- **Zoom reuniones:** `services/meeting.py` procesa transcripción (determinista; Gemini-ready). **Falta:** bajar transcript real de Cloud Recording.
- **IA (Gemini):** `services/ai.py` + fallback determinista en bullets/acciones/reuniones. **Falta:** `GEMINI_API_KEY` en `backend/.env` (→ Ajustes muestra "IA real activa").

## 7. Multi-líder
`app_users.agente_id` ancla a un líder a un nodo; JWT lleva `scope`; `view_ctx` + CTE recursiva resuelven el sub-árbol. Owner (scope null) ve todo. **Lecturas y escrituras** acotadas (Agentes, Pendientes, Inicio/command, Acciones, Capacitación, Clientes). El owner designa líderes desde Agentes. Chip "👥 Tu equipo".

## 8. Migraciones (backend/migrations/)
0001 init · 0002 queue · 0003 rls · 0004 event_catalog · 0005 daily_views · 0006 gestion_core (agentes/pendientes/capacitaciones) · 0007 executive · 0008 auth+tenant · 0009 executive_i18n · 0010 seed_i18n · 0011 agentes_geo · 0012 command_center · 0013 capacitacion_ruta · 0014 capacitacion_zoom · 0015 acciones · 0016 multilider · 0017 reuniones · 0018 clientes · 0019 briefing.

## 9. Tests
`backend/tests/` — 16 tests verde (captura/idempotencia, auth JWT/magic/hash, processing reglas US4, command _delta). Correr: `docker exec mc-local-backend sh -c "pip install -q pytest; cd /app && python -m pytest -q"`.

## 10. PENDIENTE (para próximas sesiones)
**Depende de terceros (input de Cecilia):**
- 🔴 **Número de WhatsApp** descartable (captura real de grupos).
- 🔴 **WFG**: formato de la data de producción/ventas (API/export) → para "agente consolidado estancado" + cartera real.
- 🔴 **Planilla real de los ~2.000 agentes** (importador CSV).
- 🔴 **Cuenta Zoom Pro** + Server-to-Server OAuth (asistencia + transcripts).
- **GEMINI_API_KEY** (IA real).

**Features / mejoras técnicas:**
- KPIs de volumen/ventas y bullets del resumen IA siguen **tenant-wide** para líderes (mensajes/eventos sin link a agente) — acotar cuando se conecte WFG.
- **Importador CSV de agentes** (auto-match por celular con la captura).
- **US3 — transcripción de audios (Whisper)** (gancho en el worker; falta el motor).
- ✅ **Briefing diario por WhatsApp** a Cecilia (Feature E) — `services/briefing.py` (compositor bilingüe + `tick` scheduler en el worker, 1 envío/día/tenant) + `services/waha.py` (envío, modo simulado→real) + `api/briefing.py` (config/preview/enviar/historial) + UI en /ajustes. Migración 0019 + seed `12_seed_briefing.sql`. **Falta para producción:** número conectado a WAHA + `WHATSAPP_API_KEY` en el backend (hoy modo simulado).
- Más pantallas del agente (timeline, etc.) si se quieren.
- "Modo demo" que resetee los datos sembrados antes de una presentación.
- ✅ **Detección de estancamiento/abandono** (cruce actividad+asistencia+producción) — endpoint `/dashboard/riesgo-agentes` + bloque en /ia-insights + acción "reconectar" en /acciones. Seed `infra/local-init/11_seed_riesgo.sql` (3 casos demo). **Falta para producción:** WFG (producción real, hoy proxy por pendientes cerrados) y `last_seen` real por agente (hoy via `messages.contact_id`).

## 11. Punteros clave
- Backend API: `backend/app/api/` (auth, command, gestion, agente, reuniones, dashboard, webhook, briefing).
- Servicios: `backend/app/services/` (capture, worker, processing, zoom, meeting, ai, queue, transcription, briefing, waha).
- Frontend páginas: `frontend/app/(dashboard)/*` y `frontend/app/agente/*`.
- i18n: `frontend/lib/i18n/{es,en}.ts`.
- Análisis de cliente: [VALIDACION_CLIENTE.md](VALIDACION_CLIENTE.md). Demo: [GUION_DEMO.md](GUION_DEMO.md). Journey metodología: [architect-journey.md](architect-journey.md).
