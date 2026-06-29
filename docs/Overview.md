# Overview — Asistente Comercial (mentorcomercial)

> Plataforma de **inteligencia comercial sobre WhatsApp** para **Cecilia**, dueña de una
> agencia de seguros (~2.000 agentes). Captura lo que pasa en sus grupos, lo ordena en un
> dashboard mobile-first, y con IA **detecta, sugiere y ejecuta acciones** para que no se
> le pierda ningún agente ni ningún cliente.

---

## 🔗 Links rápidos

| | |
|---|---|
| 🌐 **Panel (producción)** | https://execally.online |
| 🔌 **API** | https://api.execally.online |
| 🔑 **Login demo** | `saadypacheco@gmail.com` / `Cecilia2026` |
| 🐙 **GitHub (privado, código completo)** | github.com/saadypacheco/mentorcomercial · branch `001-captura-whatsapp-bd` |
| 🐙 **GitHub (público, mirror curado)** | github.com/saadypacheco/AsitenteComercial |
| ☁️ **Hosting** | VPS Hostinger (`76.13.234.191`) · Docker + Traefik (HTTPS auto) · DB **Supabase Cloud** |

**Claves opcionales** (el sitio funciona sin ellas, con fallbacks): `RESEND_API_KEY` (emails),
`GEMINI_API_KEY` (IA real), `TELEGRAM_BOT_TOKEN` (asistente). Van en `backend/.env` del VPS.

---

## 🧩 Qué hace (3 productos sobre un backend común)

- **① Captura WhatsApp + IA** — un **número observador** escucha los grupos y guarda todo
  (mensajes, audios, quién y cuándo); un worker clasifica y extrae eventos comerciales.
- **② Dashboard de gestión** (Cecilia + líderes) — Centro de Control, pendientes, agentes,
  clientes, eventos, reportes, **acciones sugeridas que se ejecutan**, briefing diario,
  **radar de agentes estancados**.
- **③ Onboarding / Capacitación** (agentes + líderes) — ruta de aprendizaje + app del agente
  + asistencia/reuniones de Zoom.

**Asistente conversacional:** por **Telegram** (API oficial, sin riesgo de baneo), responde
preguntas sobre los datos y (próximamente) ejecuta acciones. La captura sigue en WhatsApp.

> Para la versión **client-facing** de todo esto, ver [PRESENTACION_CECILIA.md](PRESENTACION_CECILIA.md).

---

## 🏗️ Stack

Next.js 14 (frontend mobile-first, es/en) · FastAPI (Python 3.12, auth JWT propia) ·
Postgres/**Supabase Cloud** (pgvector + pgmq) · **WAHA** (bridge WhatsApp) · LiteLLM/Gemini
(IA, con fallback determinista) · Whisper (transcripción) · Docker + **Traefik** en Hostinger.

---

## 📊 Estado

🟢 **En producción y funcionando** (captura real conectada). Para el detalle vivo (qué está
hecho, qué falta, deploy, credenciales) ver **[ESTADO_PROYECTO.md](ESTADO_PROYECTO.md)**.

---

## 📚 Documentación del proyecto

### Estado y gestión
- **[ESTADO_PROYECTO.md](ESTADO_PROYECTO.md)** — 📌 *fuente de verdad*: estado vivo, módulos, producción, pendientes, credenciales.
- [PROYECTO.md](PROYECTO.md) — descripción general del proyecto.
- [MATRIZ_PRIORIZACION.md](MATRIZ_PRIORIZACION.md) — priorización de features.
- [architect-journey.md](architect-journey.md) — bitácora de la metodología (decisiones, fases).
- [bitacora-sdd.md](bitacora-sdd.md) — bitácora spec-driven.

### Cliente / producto
- **[PRESENTACION_CECILIA.md](PRESENTACION_CECILIA.md)** — presentación simple para Cecilia (qué va a tener).
- [PRESENTACION_CLIENTE.md](PRESENTACION_CLIENTE.md) · [PRESENTATION_CLIENT_EN.md](PRESENTATION_CLIENT_EN.md) — presentaciones de cliente (es/en).
- [GUION_DEMO.md](GUION_DEMO.md) — guion para la demo.
- [DEFINICION_PRODUCTOS.md](DEFINICION_PRODUCTOS.md) — definición de los 3 productos.
- [VALIDACION_CLIENTE.md](VALIDACION_CLIENTE.md) — perfil de Cecilia, preocupaciones, gaps.
- [PREGUNTAS_DESCUBRIMIENTO.md](PREGUNTAS_DESCUBRIMIENTO.md) — preguntas de discovery a validar.

### Arquitectura / técnico
- [ARQUITECTURA.md](ARQUITECTURA.md) — arquitectura general.
- [ARQUITECTURA_ALERTAS.md](ARQUITECTURA_ALERTAS.md) — diseño del motor de alertas.
- [DATOS_DASHBOARD.md](DATOS_DASHBOARD.md) — fuentes de datos del dashboard.
- [MOCKUPS_PANTALLAS.md](MOCKUPS_PANTALLAS.md) — mockups de pantallas.
- [REPLANTEO_WHATSAPP.md](REPLANTEO_WHATSAPP.md) — replanteo de la captura WhatsApp.
- Spec de la feature: [../specs/001-captura-whatsapp-bd/spec.md](../specs/001-captura-whatsapp-bd/spec.md) · [plan.md](../specs/001-captura-whatsapp-bd/plan.md).

### Deploy / operación
- **[RUNBOOK_DEPLOY_HOSTINGER.md](RUNBOOK_DEPLOY_HOSTINGER.md)** — 🚢 guía genérica reutilizable (VPS + Traefik + Supabase) para desplegar este u otros repos.
- [DEPLOY_PRODUCCION.md](DEPLOY_PRODUCCION.md) — runbook específico de este proyecto.
- [CONECTAR_WHATSAPP_WAHA.md](CONECTAR_WHATSAPP_WAHA.md) — vincular el número observador a WAHA (QR).

### Decisiones (ADR, en la KB)
- `architect-kb/decisions/2026-06-07-stack-mentorcomercial.md` — stack.
- `architect-kb/decisions/2026-06-18-asistente-telegram-mentorcomercial.md` — asistente por Telegram.
