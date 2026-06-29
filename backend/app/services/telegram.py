"""Bot de Telegram — asistente conversacional (API oficial, sin riesgo de baneo).

Corre dentro del worker (tarea asíncrona) si hay TELEGRAM_BOT_TOKEN. Usa long-polling
(getUpdates): no necesita endpoint público. Responde con el cerebro `assistant.answer`.

Spike: solo Cecilia está habilitada (su chat = TELEGRAM_OWNER_CHAT_ID). El vínculo de
líderes (Telegram user ↔ app_user con scope) es fase 2. Ver el ADR
2026-06-18-asistente-telegram-mentorcomercial.
"""
import asyncio

import structlog

from app.core.config import settings
from app.services import assistant

logger = structlog.get_logger()

_API = "https://api.telegram.org"
# Tenant único en prod (= DEMO_TENANT). Cuando se sumen líderes, se resuelve por usuario.
_TENANT = "00000000-0000-0000-0000-0000000000a1"


def enabled() -> bool:
    return bool(settings.telegram_bot_token)


async def _send(client, chat_id, text: str) -> None:
    try:
        await client.post(
            f"{_API}/bot{settings.telegram_bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": text},
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("telegram.send_error", error=str(exc))


async def _handle(client, chat_id, text: str) -> None:
    owner = settings.telegram_owner_chat_id
    # Bootstrap: sin owner configurado, el bot te dice tu chat id para que lo cargues.
    if not owner:
        await _send(client, chat_id,
                    f"Bot activo ✅. Tu chat id es: {chat_id}\n"
                    "Cargalo en TELEGRAM_OWNER_CHAT_ID (backend/.env) para habilitarte.")
        return
    if str(chat_id) != str(owner):
        await _send(client, chat_id, "Todavía no estás habilitado para el asistente.")
        return
    if text.strip().lower() in ("/start", "hola", "hi"):
        await _send(client, chat_id,
                    "¡Hola Cecilia! 👋 Soy tu asistente comercial. Preguntame lo que quieras "
                    "sobre tu equipo, clientes, pendientes u oportunidades.")
        return
    reply = await assistant.answer(_TENANT, text, "es")
    await _send(client, chat_id, reply)


async def run() -> None:
    """Loop de long-polling. Lo lanza el worker si enabled()."""
    if not enabled():
        return
    import httpx

    logger.info("telegram.start")
    offset = 0
    async with httpx.AsyncClient(timeout=40) as client:
        while True:
            try:
                resp = await client.get(
                    f"{_API}/bot{settings.telegram_bot_token}/getUpdates",
                    params={"timeout": 30, "offset": offset},
                )
                resp.raise_for_status()
                for upd in resp.json().get("result", []):
                    offset = upd["update_id"] + 1
                    msg = upd.get("message") or {}
                    chat_id = (msg.get("chat") or {}).get("id")
                    text = msg.get("text")
                    if chat_id and text:
                        await _handle(client, chat_id, text)
            except Exception as exc:  # noqa: BLE001 — no tumbar el bot por un error de red
                logger.warning("telegram.poll_error", error=str(exc))
                await asyncio.sleep(5)
