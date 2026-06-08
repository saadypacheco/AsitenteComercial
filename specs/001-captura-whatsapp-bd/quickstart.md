# Quickstart — Validar F-001 end-to-end

Guía para **probar que F-001 funciona** sobre datos reales (1-2 grupos de prueba). No es una guía de
implementación: el código vive en `backend/` y `frontend/`; los detalles de modelo y contratos están
en [data-model.md](./data-model.md) y [contracts/](./contracts/).

## Prerrequisitos

- **Número observador dedicado** (NO el de la líder) con WhatsApp activo.
- **1-2 grupos de prueba** donde el observador esté presente.
- VPS Hostinger + Docker, o entorno local con Docker.
- Variables en `backend/.env` e `infra/.env` (ver `.env.example` de cada uno): `DATABASE_URL`,
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WAHA_BASE_URL`, `WAHA_API_KEY`, `WEBHOOK_SECRET`,
  `LLM_MODEL`, `GEMINI_API_KEY`, `WHISPER_MODEL`.

## Setup

```powershell
# 1. Levantar la infra (Postgres/Supabase + WAHA + backend + worker + frontend)
docker compose -f infra/docker-compose.yml up -d

# 2. Aplicar migraciones (en orden) contra el Postgres self-hosted
#    0001 esquema · 0002 cola · 0003 RLS · 0004 catálogo+FTS+message_states
#    (usar el cliente psql / script de migración del proyecto)

# 3. Verificar que pgmq está disponible (si NO, activar el fallback de 0002 — ver research R2)
#    psql: select * from pgmq.list_queues();

# 4. Conectar el número observador en WAHA (escanear QR) y registrar el tenant
#    con tenants.ia_wa_jid = <jid del observador>

# 5. Configurar el webhook de WAHA → POST http://backend:8002/ingest/webhook  (con HMAC)
```

> Puerto del backend: **8002** (8000=tienda, 8001=dentales, mentorcomercial=8002).

## Escenarios de validación (mapean a User Stories + Success Criteria)

### US1 — Captura fiable (P1) · SC-001, SC-002, SC-005

1. En un grupo de prueba, enviar **5 mensajes de texto** desde 2-3 participantes distintos.
2. Verificar en BD:
   ```sql
   select sender_id, body, wa_timestamp from messages order by wa_timestamp desc limit 10;
   ```
   **Esperado:** los 5 mensajes, con remitente, grupo, fecha-hora y contenido. (SC-001: sin pérdidas)
3. **Idempotencia (SC-002):** reenviar el mismo lote al webhook (o reiniciar WAHA para que reintente).
   ```sql
   select wa_message_id, count(*) from messages group by 1 having count(*) > 1;
   ```
   **Esperado:** **0 filas** (ningún duplicado).
4. **Durabilidad:** detener el worker (`docker stop`), enviar 3 mensajes, reiniciar el worker.
   **Esperado:** los 3 mensajes están en `messages` y sus jobs se procesan al volver (nada se pierde).
5. **Principio I (SC-005):** revisar config/logs → ninguna conexión de captura usa el número de la líder.
   ```sql
   select ia_wa_jid from tenants;   -- debe ser el número observador, no el de la líder
   ```

### US2 — "¿Qué pasó hoy?" (P1) · SC-003

1. Con datos ya capturados hoy, abrir el dashboard en un **celular** (o viewport móvil).
2. **Esperado:** la pantalla "¿Qué pasó hoy?" muestra volumen del día, actividad por grupo y lo más
   reciente; se entiende el pulso del día en **< 1 min** (SC-003), legible en pantalla chica (FR-008).
3. Tocar un grupo → ver el detalle de hoy de ese grupo (US2-AC2).
4. **Estado vacío:** consultar un día sin actividad → mensaje claro de "sin actividad", no un error.
5. **Ventana ET (FR-018):** enviar un mensaje cerca de medianoche ET y verificar que cae en el día ET correcto.

### US3 — Transcripción (P2) · SC-004, SC-006

1. Enviar una **nota de voz** (en español y otra en inglés) al grupo de prueba.
2. Verificar:
   ```sql
   select t.text, t.language from transcriptions t join messages m on m.id = t.message_id
   where m.type = 'audio' order by t.created_at desc limit 5;
   ```
   **Esperado:** transcripción en texto, en el **idioma original** del audio (es/en) (SC-004).
3. **Trazabilidad (SC-006):** cada transcripción enlaza a su audio (`message_id`); en la UI se puede
   abrir el audio original.
4. **Audio en idioma no soportado/ininteligible:** no rompe el flujo; el mensaje queda registrado sin
   transcripción utilizable (edge case).

### US4 — Eventos comerciales (P2) · SC-007, SC-008

1. Enviar mensajes de prueba con una **venta clara** ("cerré la póliza de vida con el cliente X") y una
   **objeción clara** ("el cliente dice que está muy caro").
2. Verificar:
   ```sql
   select e.type, e.description, e.confidence, e.created_by,
          (select count(*) from event_sources s where s.event_id = e.id) as fuentes
   from commercial_events e order by e.created_at desc limit 10;
   ```
   **Esperado (SC-008):** aparecen eventos `venta` y `objecion` con el **tipo correcto**.
3. **Sin falsos positivos (SC-008 / US4-AC3):** enviar un mensaje trivial sin contenido comercial
   ("buenos días a todos 👋"). **Esperado:** **no** se crea un evento.
4. **Trazabilidad (SC-007):** la columna `fuentes` de cada evento es **≥ 1** (ningún evento sin origen).
   En la UI, abrir un evento muestra el/los mensaje(s) que lo originaron.
5. **Hecho vs inferencia (FR-015):** en "¿Qué pasó hoy?", la actividad cruda y los eventos IA se ven
   **claramente diferenciados** (los eventos marcan que son inferidos por IA).

## Tests automatizados (backend)

```powershell
cd backend; pytest -q
```
Cubre como mínimo: idempotencia de captura (0 duplicados), persistencia completa del payload (`raw`),
y extracción sin falsos positivos sobre un set fijo de mensajes.

## Criterio de "F-001 demostrable"

- [ ] US1: 100% capturado, 0 duplicados, número de la líder intacto.
- [ ] US2: "¿Qué pasó hoy?" usable en celular, < 1 min para entender el día.
- [ ] US3: audios es/en transcritos y trazables a su origen.
- [ ] US4: ventas/objeciones detectadas con tipo correcto, cada evento con su traza, sin falsos positivos.
