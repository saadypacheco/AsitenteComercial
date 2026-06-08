# infra — mentorcomercial

Infra **autogestionada** (VPS Hostinger + Docker), igual patrón que `solucionesdentales`/`tienda`.

## Componentes

| Servicio | Qué es | Puerto |
|---|---|---|
| `waha` | Bridge WhatsApp (captura grupos) — número IA dedicado | 3000 (solo localhost) |
| `backend` | API FastAPI (ingesta + endpoints) | 8002 (solo localhost) |
| `worker` | Procesamiento IA async (transcripción + clasificación) | — |
| *(externo)* Supabase self-hosted | Postgres + Auth + Storage + Realtime | 8000 / 5432 |

## Levantar (F0)

```bash
cp .env.example .env          # completar WAHA_API_KEY + WEBHOOK_SECRET
cp ../backend/.env.example ../backend/.env   # completar Supabase + Gemini
docker compose --env-file .env up -d
```

Setup del bridge (escanear QR, unir a grupos) → ver `docs/ARQUITECTURA.md` §4 y la
guía paso a paso del bridge.

## Supabase self-hosted

Se despliega aparte con el compose oficial de Supabase (`supabase/docker`). Apuntar
`backend/.env` (`SUPABASE_URL`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) a esa
instancia y aplicar `backend/migrations/*.sql`.

## Robustez / backups (al ADR)

- `pg_dump` diario del Postgres + WAL archiving a almacenamiento offsite cifrado.
- **Backup del volumen `waha_sessions`** (estado de auth del bridge) → no re-escanear QR.
- Health-check de la sesión WAHA + alerta si se desconecta (no quedar ciego).
- F0 = single-node · F2 = HA/réplica.
