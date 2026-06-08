# Contrato — Webhook de captura (WAHA → backend)

**Interfaz interna.** El bridge WAHA postea cada evento de WhatsApp al backend. Es la **única**
entrada de datos de captura de F-001. No es pública (red privada Docker).

## Endpoint

```
POST /ingest/webhook
Host: backend (red privada)
Content-Type: application/json
X-Webhook-Hmac: <hex hmac-sha256 del body crudo con settings.webhook_secret>
```

**Autenticación:** HMAC-SHA256 del body con `settings.webhook_secret`. Si no hay secreto (solo dev),
se acepta; en prod **siempre** se setea (FR de robustez). Firma inválida → `401`.

**Restricción constitucional I:** el campo de sesión del payload **debe** corresponder al número
observador dedicado del tenant (`tenants.ia_wa_jid`). Un evento de otra sesión se rechaza/ignora y se
loguea. Ninguna credencial de la líder participa.

## Eventos consumidos

| `event` | Acción | US |
|---|---|---|
| `message` / `message.any` | Captura: persiste mensaje + media + triage + encola job IA | US1 |
| `session.status` | Salud del bridge: si se desconecta, **alerta** (no quedar ciego) | edge case |
| (otros) | Ignorado, con `{"ok": true, "ignored": <kind>}` | — |

## Payload de entrada (mensaje) — forma esperada

WAHA varía el shape por versión; F-001 depende de estos campos (el resto se guarda en `raw`):

```jsonc
{
  "event": "message",
  "session": "<jid del número observador>",   // valida Principio I
  "payload": {
    "id": "<wa_message_id>",                   // idempotencia (requerido)
    "from": "<wa_chat_id>",                     // ..@g.us (grupo) o ..@c.us (1:1)
    "participant": "<wa_jid del remitente>",    // en grupos: quién lo envió
    "fromMe": false,
    "type": "chat|image|audio|video|document|location|sticker",
    "body": "<texto o caption>",
    "timestamp": 1717718400,                    // epoch s → wa_timestamp (timestamptz)
    "hasMedia": true,
    "mediaUrl": "<url de descarga en el bridge>",
    "mimeType": "audio/ogg; codecs=opus",
    "quotedMsgId": "<id citado|null>"
  }
}
```

**Campos mínimos requeridos:** `payload.id`, `payload.from`, `payload.timestamp`, `payload.type`.
Si falta `id` → no se puede deduplicar → se rechaza con `400` y se loguea (no se inventa id).

## Procesamiento (orden, idempotente)

1. Validar HMAC. (401 si falla)
2. Validar que `session` = número observador del tenant. (ignora + log si no)
3. `upsert` `contacts` (remitente) y `chats` (grupo/1:1) — `on conflict (tenant_id, wa_*) do update display_name`.
4. `insert` `messages` con `raw` = payload completo — `on conflict (tenant_id, wa_message_id) do nothing`.
5. Si `hasMedia`: descargar del bridge → Supabase Storage → `insert media`. (puede diferirse al worker)
6. `insert message_triage(status='new')`.
7. Encolar job en pgmq `ai_processing` con el `message_id`.
8. Responder `200`.

**Garantía de durabilidad (SC-001):** el mensaje se persiste en `messages` **antes** de encolar; si
el worker cae, el job sigue en la cola. Si el webhook responde no-2xx, WAHA reintenta → el paso 4
(idempotente) evita duplicar (SC-002).

## Respuestas

| Código | Cuándo | Body |
|---|---|---|
| `200` | Procesado o ignorado | `{"ok": true, "captured": true, "wa_message_id": "..."}` |
| `400` | Payload sin `id`/campos mínimos | `{"detail": "payload inválido"}` |
| `401` | HMAC inválido | `{"detail": "firma inválida"}` |
| `5xx` | Error interno (WAHA reintenta) | — |

## Edge cases cubiertos

- **Reintento del bridge** → idempotencia (paso 4). 0 duplicados.
- **Desconexión** (`session.status` desconectado) → log de alerta; la captura no pierde silenciosamente.
- **No-texto/audio** → `media` con metadata; sin analizar contenido (FR-016).
- **Editado/borrado** (eventos `message.edited` / `message.revoked` según WAHA) → **no** mutar
  `messages`; insertar en `message_states` (FR-017). Mapear el `event` real de WAHA en implement.
