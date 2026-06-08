# Bitácora SDD — mentorcomercial

Registro cronológico de fases (Spec-Driven Development). Detalle de sesiones en
`docs/architect-journey.md` (interno).

---

## Fase 0 — Discovery ✅

**Problema:** una líder de ventas de seguros gestiona ~2.000 agentes de forma manual;
el día a día vive en WhatsApp (sobre todo grupos) y se ahoga.

**Usuarios:** líder + líderes intermedios (gestión) y agentes. Nivel técnico bajo,
mobile-first, multi-idioma (agentes en EE.UU.).

**Restricciones duras:** no tocar el número/iPhone de la líder · no usar API oficial para
el número principal · datos financieros sensibles (región EE.UU.) · bajo riesgo operativo.

**Tipos de producto:** #1 Web full-stack · #8 Integración/automatización · #12 AI-first.

**Hallazgo que define el rumbo:** WhatsApp Business API **no soporta grupos** → captura
de grupos solo con **bridge no oficial** (riesgo de baneo, aislado en número descartable).

---

## Fase 1 — Stack ✅ (2026-06-07)

**Decisión (Opción A+):** Next.js + FastAPI + **Supabase self-hosted** (Postgres + pgvector)
+ **Gemini Flash vía LiteLLM** (cambiable) + **Whisper self-host** (multi-idioma) +
bridge WAHA, todo en **VPS Hostinger + Docker**. Infra **autogestionada** (single-node F0,
HA F2).

**Path dependence:** 🔴 RED detectada (stack org en 6 ADRs + proyectos físicos) y
**mitigada** — se eligió el stack org tras comparar n8n / Edge / AI SDK. Gemelo: `solucionesdentales`.

**Robustez:** cola durable (pgmq) · idempotencia (`wa_message_id`) · bridge supervisado ·
backups en capas · observabilidad (logs con traceid).

ADR: `architect-kb/decisions/2026-06-07-stack-mentorcomercial.md`

---

## Fase 2 — Bootstrap ✅ (2026-06-07)

- Repo reorganizado a estructura org (monorepo split): `frontend/` + `backend/` + `infra/`
  + `docs/` + `mockups/`.
- Prototipo HTML → `mockups/`. Docs de discovery/diseño/presentación → `docs/`.
- Scaffolding: `.gitignore` robusto, `AGENTS.md` (12 secciones), `.env.example` por servicio.
- **Migraciones SQL** creadas: `0001_init` (esquema), `0002_queue` (pgmq), `0003_rls` (multi-tenant).
- Backend FastAPI: webhook de captura, gateway LiteLLM, transcripción Whisper, worker.

---

## Fase 3 — Features (próximo)

- **F-001:** Captura WhatsApp → BD + transcripción + dashboard "¿Qué pasó hoy?" (alcance de la demo).
- Pendiente: `specify init` + `/speckit-constitution` + `/speckit-specify` para F-001.
