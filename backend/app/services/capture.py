"""Servicio de captura: persiste TODO mensaje de WhatsApp en la BD.

Regla de oro (docs/ARQUITECTURA.md §2): se filtra en la ENTREGA, nunca en la captura.
Acá no se descarta nada — todo va a la BD inmutable con triage 'new'.

Garantías:
  - Idempotencia: on conflict (tenant_id, wa_message_id) do nothing (SC-002).
  - Durabilidad: se persiste el mensaje ANTES de encolar el job IA (SC-001).
  - Principio I: solo se captura si la sesión = número observador del tenant (SC-005).
  - Inmutabilidad: edición/borrado → message_states, NUNCA update de messages (FR-017).

Ref: specs/001-captura-whatsapp-bd/contracts/webhook-waha.md
"""
import structlog

from app.db.repository import CaptureRepo, get_capture_repo
from app.models.waha import NON_PROCESSED_TYPES, WahaEvent, WahaMessagePayload
from app.services import queue
from app.services import onboarding_ingest

logger = structlog.get_logger()

# Eventos de WAHA que representan edición/borrado (varían por versión; se mapean acá).
_EDIT_EVENTS = {"message.edited", "message.edit"}
_DELETE_EVENTS = {"message.revoked", "message.revoke", "message.delete"}


class CaptureError(Exception):
    """Error recuperable de captura (el webhook responde 4xx/5xx según el caso)."""


def handle_message(event_dict: dict, repo: CaptureRepo | None = None) -> dict:
    """Procesa un evento de WAHA e inserta en la BD (idempotente).

    Es SÍNCRONO a propósito (accesos a BD bloqueantes); el webhook lo corre en un
    thread para no bloquear el event loop.
    """
    repo = repo or get_capture_repo()
    event = WahaEvent.model_validate(event_dict)

    # Principio I: la sesión DEBE ser el número observador de algún tenant.
    if not event.session:
        raise CaptureError("evento sin 'session'")
    tenant_id = repo.get_tenant_id_by_session(event.session)
    if not tenant_id:
        logger.warning("capture.session_rechazada", session=event.session)
        return {"captured": False, "reason": "session_no_es_observador"}

    kind = event.event or ""
    if kind in _EDIT_EVENTS or kind in _DELETE_EVENTS:
        return _handle_state_change(event, tenant_id, repo, kind)

    return _handle_new_message(event, tenant_id, repo)


def _handle_new_message(event: WahaEvent, tenant_id: str, repo: CaptureRepo) -> dict:
    payload = WahaMessagePayload.model_validate(event.payload)

    if not payload.id:
        raise CaptureError("payload sin 'id' (no se puede deduplicar)")

    # Filtro de ruido: estados (status@broadcast) y mensajes de protocolo/sync no son
    # conversación real → no se capturan (mantienen /mensajes limpio).
    if payload.is_noise:
        logger.info("capture.ruido", chat=payload.chat_id, type=payload.type)
        return {"captured": False, "reason": "ruido"}

    # Upsert de remitente (con su nombre de WhatsApp) y chat. El número real se prefiere
    # sobre el identificador @lid; el nombre se actualiza solo en mensajes siguientes.
    sender_id = repo.upsert_contact(tenant_id, payload.sender_jid, display_name=payload.push_name)
    chat_id = repo.upsert_chat(
        tenant_id,
        payload.chat_id,
        type_="group" if payload.is_group else "individual",
        name=None,
    )

    row = {
        "tenant_id": tenant_id,
        "wa_message_id": payload.id,
        "chat_id": chat_id,
        "sender_id": sender_id,
        "direction": "out" if payload.from_me else "in",
        "type": payload.type,
        "body": payload.text,
        "quoted_msg_id": payload.quoted_msg_id,
        "wa_timestamp": payload.wa_timestamp.isoformat(),
        "raw": event.payload,                       # payload COMPLETO (red de seguridad)
    }
    inserted = repo.insert_message(row)

    if not inserted:
        # Duplicado (reintento del bridge): idempotente, no se reencola (SC-002).
        logger.info("capture.duplicado", wa_message_id=payload.id)
        return {"captured": True, "duplicate": True, "wa_message_id": payload.id}

    message_id = repo.get_message_id(tenant_id, payload.id)

    # Media no-texto/no-audio: registrar metadata, sin analizar contenido (FR-016).
    # (La descarga del binario a Storage la hace el worker — US3.)
    if payload.has_media or payload.type in NON_PROCESSED_TYPES:
        repo.insert_media(
            {
                "tenant_id": tenant_id,
                "message_id": message_id,
                "mime_type": payload.mime_type,
                "downloaded": False,
            }
        )

    repo.insert_triage(message_id, tenant_id)

    # Durabilidad: encolar DESPUÉS de persistir. Si esto falla, el mensaje ya está
    # guardado y se puede reencolar; nunca se pierde (SC-001).
    queue.enqueue(message_id=message_id, tenant_id=tenant_id)

    logger.info("capture.message", wa_message_id=payload.id, type=payload.type, chat=payload.chat_id)

    # Canal de onboarding: si el mensaje viene del grupo designado por el tenant,
    # lanzar el pipeline de clasificación y publicación (no bloquea la captura).
    try:
        onboarding_chat = onboarding_ingest.get_tenant_onboarding_chat(tenant_id)
        if onboarding_chat and payload.chat_id == onboarding_chat and not payload.from_me:
            onboarding_ingest.process_onboarding_message(
                tenant_id=tenant_id,
                message_id=message_id,
                tipo=payload.type,
                body=payload.text,
                media_url=payload.raw.get("mediaUrl") if payload.has_media else None,
                mime_type=payload.mime_type,
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning("capture.onboarding_ingest_error", error=str(exc))

    return {"captured": True, "duplicate": False, "wa_message_id": payload.id, "message_id": message_id}


def _handle_state_change(event: WahaEvent, tenant_id: str, repo: CaptureRepo, kind: str) -> dict:
    """Edición/borrado: append a message_states, sin tocar el original (FR-017)."""
    wa_message_id = event.payload.get("id")
    if not wa_message_id:
        raise CaptureError("evento de estado sin 'id'")

    message_id = repo.get_message_id(tenant_id, wa_message_id)
    if not message_id:
        # Llegó un edit/delete de un mensaje que no capturamos: lo ignoramos con log.
        logger.warning("capture.state_sin_original", wa_message_id=wa_message_id, kind=kind)
        return {"captured": False, "reason": "original_no_encontrado"}

    state = "deleted" if kind in _DELETE_EVENTS else "edited"
    repo.insert_message_state(
        {
            "tenant_id": tenant_id,
            "message_id": message_id,
            "state": state,
            "new_body": event.payload.get("body") if state == "edited" else None,
            "raw": event.payload,
        }
    )
    logger.info("capture.state_change", wa_message_id=wa_message_id, state=state)
    return {"captured": True, "state": state, "wa_message_id": wa_message_id}
