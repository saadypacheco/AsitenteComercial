# Contrato — Datos del dashboard "¿Qué pasó hoy?" (frontend ← Supabase)

**Interfaz de lectura.** El frontend Next.js consume los datos vía el cliente Supabase (PostgREST +
RLS), **no** vía endpoints propios del backend. Toda lectura va filtrada por `tenant_id` (RLS por JWT
`app_metadata.tenant_id`). El frontend nunca usa el `service_role`.

## Principios del contrato

- **Hecho vs inferencia separados** (FR-015): la respuesta distingue *actividad capturada* de *eventos IA*.
- **Ventana "hoy" = ET** (FR-018): el filtro de fecha lo aplica la consulta sobre `wa_timestamp`, no el cliente.
- **Trazabilidad** (FR-014): todo evento trae sus `message_id` de origen; la UI siempre puede abrir la evidencia.
- **Mobile-first** (FR-008): payloads chicos, pensados para una pantalla de celular.

## Lecturas que necesita la vista

### 1. Resumen del día (US2 — sección cruda / hecho)

Fuente: `messages` + `chats` + `message_triage`, filtrado a la ventana ET de hoy.

```jsonc
// GET (vía supabase-js) — resumen agregado del día
{
  "fecha_et": "2026-06-07",
  "total_mensajes": 142,
  "por_chat": [
    { "chat_id": "uuid", "nombre": "Grupo Ventas Norte", "tipo": "group",
      "mensajes": 87, "ultimo": "2026-06-07T16:32:00-04:00" }
  ],
  "ultimos": [
    { "message_id": "uuid", "chat": "Grupo Ventas Norte", "remitente": "Ana",
      "tipo": "text", "preview": "...", "wa_timestamp": "2026-06-07T16:32:00-04:00" }
  ],
  "vacio": false   // true → la UI muestra estado vacío claro, no un error (edge case)
}
```

### 2. Detalle de un chat hoy (US2-AC2)

```jsonc
// lista de mensajes de un chat dentro de la ventana ET de hoy
[
  { "message_id": "uuid", "remitente": "Ana", "tipo": "text",
    "body": "...", "wa_timestamp": "...",
    "transcripcion": null,                       // o { texto, idioma, audio_message_id } si type=audio
    "media": null }                              // o { tipo, storage_path } si no-texto
]
```

### 3. Eventos comerciales del día (US4 — sección inferencia)

Fuente: `commercial_events` + `event_sources` → `messages`, ventana ET de hoy.

```jsonc
[
  {
    "event_id": "uuid",
    "type": "venta",                  // venta | objecion | seguimiento | consulta
    "label": "Venta",                 // label i18n (es/en) resuelto en UI
    "resumen": "Cliente confirmó póliza de vida",
    "agente": "Ana",                  // o null si no identificable
    "confidence": 0.82,
    "created_by": "ai",               // marca de INFERENCIA (UI lo señala distinto del hecho)
    "fuentes": [                       // TRAZA obligatoria — nunca vacío (FR-014/SC-007)
      { "message_id": "uuid", "chat": "Grupo Ventas Norte", "preview": "...", "wa_timestamp": "..." }
    ]
  }
]
```

**Invariante de UI:** si `fuentes` viniera vacío, el evento **no se muestra** (no debería existir por
la invariante de BD; la UI lo trata como defensa en profundidad).

### 4. Transcripción (US3)

Servida embebida en el detalle del mensaje (`transcripcion` en #2). Incluye el `audio_message_id`
para que la UI ofrezca el audio original (signed URL de Storage) → trazabilidad (US3-AC3).

## Estados y mobile

- **Día sin actividad:** `vacio: true` → pantalla "hoy no hubo actividad capturada" (no error).
- **Idioma:** los `label` de tipo de evento y la UI salen del sistema i18n es/en; los datos
  (`resumen`, `body`, `transcripcion.idioma`) vienen en su idioma original.
- **Realtime (opcional F-001):** Supabase Realtime puede empujar nuevos mensajes a la vista; no es
  requisito de F-001 (el refresh manual basta para el demo).

## Seguridad

- RLS niega por defecto; solo filas del `tenant_id` del JWT (FR-009).
- Media servida por **signed URLs** de Storage (no URLs públicas).
- El frontend no recibe el `service_role` key bajo ninguna circunstancia (lección KB).
