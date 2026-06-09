"""Procesamiento de un mensaje capturado (lo corre el worker, US4).

Clasifica el mensaje (importancia + categoría) y, si es un evento comercial
(venta/objeción/seguimiento/consulta), lo extrae a commercial_events con su
trazabilidad a la fuente (event_sources, FR-003).

Estrategia: REGLAS deterministas (funciona sin API key, offline). Cuando exista
GEMINI_API_KEY, la extracción con LLM (ai.extract_events) se engancha acá mismo;
las reglas quedan de fallback. Idempotente: un mensaje no genera dos veces el evento.
"""
import structlog

from app.core.config import settings

logger = structlog.get_logger()

# Palabras clave por categoría (es). El orden define prioridad de match.
_RULES = [
    ("objecion", "red", ("reclamo", "queja", "problema", "muy caro", "carísimo", "carisimo",
                          "cancelar", "molesto", "disconforme", "no quiere", "devolver", "mal ")),
    ("venta", "white", ("cerré", "cerre", "vendí", "vendi", "cerrada", "cerramos", "contrató",
                         "contrato", "compró", "compro", "firmó", "firmo", "🎉", "vendido")),
    ("seguimiento", "yellow", ("seguimiento", "llamar", "contactar", "agendar", "reagendar",
                               "recordar", "cita", "visita", "coordinar", "coordinación", "coordinacion")),
    ("consulta", "yellow", ("consulta", "pregunta", "información", "informacion", "cuánto", "cuanto",
                            "precio", "cotización", "cotizacion", "duda", "¿", "?")),
]
# categoría → tipo de evento comercial del catálogo (0004). 'otro' = no es evento.
_EVENT_TYPE = {"objecion": "objecion", "venta": "venta", "seguimiento": "seguimiento", "consulta": "consulta"}


def classify(text: str | None) -> dict:
    """Devuelve {importance, category, event_type|None} por reglas (multi-idioma básico)."""
    t = (text or "").lower()
    if not t.strip():
        return {"importance": "white", "category": "otro", "event_type": None}
    for category, importance, words in _RULES:
        if any(w in t for w in words):
            return {"importance": importance, "category": category, "event_type": _EVENT_TYPE.get(category)}
    return {"importance": "white", "category": "otro", "event_type": None}


def _pg():
    import psycopg

    if not settings.database_url:
        raise RuntimeError("DATABASE_URL no configurado")
    return psycopg.connect(settings.database_url, autocommit=True)


def process_message(message_id: str, tenant_id: str) -> dict:
    """Clasifica el mensaje y, si corresponde, extrae el evento comercial. Idempotente."""
    with _pg() as c, c.cursor() as cur:
        cur.execute("select type, body from messages where id = %s and tenant_id = %s", (message_id, tenant_id))
        row = cur.fetchone()
        if not row:
            return {"ok": False, "reason": "mensaje_inexistente"}
        mtype, body = row
        # En audio, el texto a clasificar es la transcripción (US3) si existe.
        if mtype == "audio":
            cur.execute("select text from transcriptions where message_id = %s", (message_id,))
            tr = cur.fetchone()
            body = (tr[0] if tr else None) or body

        cls = classify(body)

        # Triage: importancia + categoría (la fila la creó la captura con status 'new').
        cur.execute(
            "update message_triage set importance = %s, category = %s where message_id = %s",
            (cls["importance"], cls["category"], message_id),
        )

        created_event = None
        if cls["event_type"]:
            # Idempotencia: no extraer dos veces el evento del mismo mensaje.
            cur.execute("select 1 from event_sources where message_id = %s limit 1", (message_id,))
            if not cur.fetchone():
                titulo = (body or cls["category"]).strip()[:90]
                cur.execute(
                    "insert into commercial_events (tenant_id, type, status, title, importance, "
                    "confidence, created_by) values (%s, %s, 'open', %s, %s, 0.7, 'ai') returning id",
                    (tenant_id, cls["event_type"], titulo, cls["importance"]),
                )
                event_id = cur.fetchone()[0]
                cur.execute(
                    "insert into event_sources (event_id, message_id) values (%s, %s) on conflict do nothing",
                    (event_id, message_id),
                )
                created_event = {"id": str(event_id), "type": cls["event_type"]}

    logger.info("worker.processed", message_id=message_id, category=cls["category"], event=bool(created_event))
    return {"ok": True, "classification": cls, "event": created_event}
