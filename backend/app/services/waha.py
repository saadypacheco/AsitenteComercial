"""Envío de mensajes por WhatsApp vía WAHA (ANDAMIAJE — listo para enchufar el número).

La captura (recepción) ya existe en services/capture.py; esto es el lado de SALIDA:
mandar un texto a un número (p.ej. el briefing diario a la dueña, o un recordatorio
a un agente desde la bandeja de acciones).

Estados (mismo criterio que services/zoom.py):
  - SIN API key / SIN sesión WAHA conectada (hoy): `enabled()` = False → modo SIMULADO
    (se loguea y se reporta, no se envía). Permite probar todo el pipeline sin número.
  - CON número observador conectado + WHATSAPP_API_KEY: POST real a /api/sendText.

Qué falta para producción: número descartable conectado a la sesión WAHA 'default'
(escanear QR en http://localhost:4500) + WHATSAPP_API_KEY en el entorno del backend.
"""
import structlog

from app.core.config import settings

logger = structlog.get_logger()

_SESSION = "default"   # sesión WAHA por defecto (la que se autentica con el QR)


def enabled() -> bool:
    """True si hay API key configurada para hablarle a WAHA. Sin ella → simulado."""
    return bool(settings.waha_api_key)


def send_text(jid: str, text: str, session: str = _SESSION) -> dict:
    """Envía un texto a un chat de WhatsApp. Devuelve {modo, ok}.

    modo: 'simulado' (no configurado), 'real' (enviado) o 'error' (falló el envío).
    Nunca lanza: aislar el fallo de envío para no tumbar al worker/endpoint que llama.
    """
    if not jid or not text:
        return {"modo": "error", "ok": False}
    if not enabled():
        logger.info("waha.send.simulado", jid=jid, chars=len(text))
        return {"modo": "simulado", "ok": True}
    try:
        import httpx  # import diferido: no es necesario en modo simulado

        resp = httpx.post(
            f"{settings.waha_base_url}/api/sendText",
            json={"session": session, "chatId": jid, "text": text},
            headers={"X-Api-Key": settings.waha_api_key},
            timeout=15,
        )
        resp.raise_for_status()
        logger.info("waha.send.real", jid=jid)
        return {"modo": "real", "ok": True}
    except Exception as exc:  # noqa: BLE001
        logger.warning("waha.send_error", jid=jid, error=str(exc))
        return {"modo": "error", "ok": False}


def get_group_name(group_jid: str, session: str = _SESSION) -> str | None:
    """Nombre (subject) de un grupo, consultando la API de WAHA. None si no se pudo.

    El nombre del grupo NO viaja en cada mensaje (solo el ID), así que se pide aparte
    —una vez por grupo, desde el worker— para no recargar el camino de captura."""
    if not enabled() or not group_jid:
        return None
    try:
        import httpx

        resp = httpx.get(
            f"{settings.waha_base_url}/api/{session}/groups/{group_jid}",
            headers={"X-Api-Key": settings.waha_api_key},
            timeout=10,
        )
        resp.raise_for_status()
        d = resp.json()
        # El campo varía por versión: subject directo, o anidado en groupMetadata.
        return d.get("subject") or (d.get("groupMetadata") or {}).get("subject") or d.get("name")
    except Exception as exc:  # noqa: BLE001
        logger.warning("waha.group_name_error", group=group_jid, error=str(exc))
        return None
