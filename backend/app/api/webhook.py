"""Webhook de captura: el bridge (WAHA) postea cada evento de WhatsApp aquí.

Flujo (ver contracts/webhook-waha.md):
  1. valida firma HMAC del webhook
  2. resuelve tenant por la sesión (= número observador; Principio I)
  3. upsert contact + chat
  4. insert message (idempotente por wa_message_id)
  5. registra media metadata (FR-016) · 6. triage 'new' · 7. encola job IA
  - edición/borrado → message_states (FR-017, inmutable)
  - session.status desconectado → alerta (no quedar ciego)
"""
import asyncio
import hashlib
import hmac

import structlog
from fastapi import APIRouter, Header, HTTPException, Request

from app.core.config import settings
from app.services import capture

router = APIRouter()
logger = structlog.get_logger()

_MESSAGE_EVENTS = {"message", "message.any"}
_STATE_EVENTS = {
    "message.edited", "message.edit",
    "message.revoked", "message.revoke", "message.delete",
}


def _valid_signature(body: bytes, *signatures: str | None) -> bool:
    """Valida HMAC-SHA256. Acepta varios headers para compatibilidad con distintas versiones de WAHA.

    Sin WEBHOOK_SECRET configurado: pasa siempre (solo válido en dev).
    En prod, WEBHOOK_SECRET debe estar seteado y WAHA debe tener WHATSAPP_HOOK_HMAC_KEY=mismo valor.
    """
    if not settings.webhook_secret:
        return True
    expected = hmac.new(settings.webhook_secret.encode(), body, hashlib.sha256).hexdigest()
    for sig in signatures:
        if sig and hmac.compare_digest(expected, sig.lower()):
            return True
    return False


@router.post("/webhook")
async def ingest(
    request: Request,
    x_waha_signature: str | None = Header(default=None),    # WAHA >= 2024
    x_webhook_hmac: str | None = Header(default=None),      # compatibilidad legado
) -> dict:
    body = await request.body()
    if not _valid_signature(body, x_waha_signature, x_webhook_hmac):
        raise HTTPException(status_code=401, detail="firma inválida")

    event = await request.json()
    kind = event.get("event")

    if kind in _MESSAGE_EVENTS or kind in _STATE_EVENTS:
        # Validación mínima de payload antes de tocar la BD (contrato: id requerido).
        if kind in _MESSAGE_EVENTS and not (event.get("payload") or {}).get("id"):
            raise HTTPException(status_code=400, detail="payload sin 'id'")
        try:
            # La captura es síncrona (BD bloqueante): se corre en thread.
            result = await asyncio.to_thread(capture.handle_message, event)
        except capture.CaptureError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {"ok": True, **result}

    if kind == "session.status":
        # robustez: si el bridge se desconecta, alertar (no quedar ciego)
        payload = event.get("payload") or {}
        status = payload.get("status") or payload
        level = logger.error if str(status).lower() in {"disconnected", "failed", "stopped"} else logger.info
        level("bridge.status", status=status)
        return {"ok": True, "handled": "session.status"}

    return {"ok": True, "ignored": kind}
