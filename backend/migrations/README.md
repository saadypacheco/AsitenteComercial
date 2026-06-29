# Migraciones — mentorcomercial

SQL versionado para el Postgres (Supabase self-hosted). Se aplican en orden.

| Archivo | Qué hace |
|---|---|
| `0001_init.sql` | Esquema base: captura WhatsApp + memoria comercial (multi-tenant) + pgvector |
| `0002_queue.sql` | Cola durable `ai_processing` (pgmq) entre captura y procesamiento |
| `0003_rls.sql` | Row Level Security multi-tenant (aislamiento por `tenant_id`) |

## Aplicar

```bash
# contra el Postgres del Supabase self-hosted
psql "$DATABASE_URL" -f migrations/0001_init.sql
psql "$DATABASE_URL" -f migrations/0002_queue.sql
psql "$DATABASE_URL" -f migrations/0003_rls.sql
```

> Si usás el CLI de Supabase, mover estos archivos a `supabase/migrations/` con el
> prefijo de timestamp que el CLI espera. Para self-hosted directo, `psql` alcanza.

## Notas (lessons KB aplicables)

- **Grants explícitos** en cada migration para Supabase cloud/self-host
  (`architect-kb/lessons/supabase-cloud-grants-explicitos-en-migration.md`).
- `pgmq` requiere que la imagen de Postgres traiga la extensión; si no, usar el
  fallback con tabla `processing_jobs` (comentado en `0002_queue.sql`).
- El `service_role` bypassa RLS — nunca exponerlo al frontend
  (`architect-kb/lessons/supabase-service-role-key-nunca-en-frontend.md`).
