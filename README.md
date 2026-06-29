# 🎯 Assistant — Inteligencia comercial sobre WhatsApp

> Convierte el caos de WhatsApp de un líder de ventas en una **memoria comercial
> priorizada y consultable**. Captura automática, transcripción de audios, eventos
> comerciales estructurados y dashboard — sin tocar el WhatsApp personal del líder.

**Nombre de trabajo — marca final TBD.** Multi-idioma.

## Estructura del repo

| Carpeta | Qué hay |
|---|---|
| `frontend/` | Dashboard web — Next.js 14 + TS + Tailwind + Zustand |
| `backend/` | API FastAPI + worker IA + **migraciones SQL** |
| `infra/` | `docker-compose` — bridge WhatsApp (WAHA) + backend + worker |
| `docs/` | Arquitectura, discovery, presentación al cliente |
| `mockups/` | Prototipo HTML navegable (referencia visual) |

## 🔗 Prototipo navegable (mockups)

- **Landing:** [mockups/index.html](mockups/index.html)
- **Login (multi-idioma):** [mockups/login.html](mockups/login.html)
- **App del líder:** [mockups/dashboard-v5-mi-dia.html](mockups/dashboard-v5-mi-dia.html)
- **App del agente:** [mockups/agente.html](mockups/agente.html)

> Prototipo con datos de ejemplo, sin backend. La interfaz real se porta a `frontend/`.

## Arquitectura (resumen)

```
WhatsApp (grupos) → Número IA observador → Bridge WAHA → FastAPI (ingesta)
   → Supabase self-hosted (Postgres + Storage) → cola pgmq → worker (Whisper + LLM)
   → memoria comercial + Dashboard
```

Detalle completo: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) ·
Stack y decisiones: `architect-kb/decisions/2026-06-07-stack-mentorcomercial.md` ·
Guía del proyecto: [AGENTS.md](AGENTS.md)

## Arrancar (dev)

```bash
# Backend
cd backend && cp .env.example .env   # completar
uv pip install -e . && uvicorn app.main:app --reload --port 8002

# Migraciones (Supabase self-hosted)
psql "$DATABASE_URL" -f migrations/0001_init.sql
psql "$DATABASE_URL" -f migrations/0002_queue.sql
psql "$DATABASE_URL" -f migrations/0003_rls.sql

# Infra (bridge + backend + worker)
cd infra && cp .env.example .env && docker compose --env-file .env up -d

# Frontend
cd frontend && npx create-next-app@14 . --ts --tailwind --app --src-dir && npm run dev
```

## Estado

- ✅ F1 — Stack decidido (ADR) · repo bootstrapeado · migraciones · scaffold backend/infra
- ⏳ F0 (demo, 2 semanas) — bridge capturando grupos reales → BD → transcripción → dashboard "¿Qué pasó hoy?"

---

*2026 · Saady Pacheco · saadypacheco@gmail.com*
