"""Modelos del payload del bridge WAHA (entrada del webhook de captura).

Tolerantes a variaciones de versión de WAHA: solo se modelan los campos que F-001
necesita; el resto del payload se conserva crudo en `messages.raw` (red de seguridad).

Ref: specs/001-captura-whatsapp-bd/contracts/webhook-waha.md
"""
from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field


# Tipos WAHA → tipo normalizado de `messages.type`
_WAHA_TYPE_MAP = {
    "chat": "text",
    "text": "text",
    "image": "image",
    "audio": "audio",
    "ptt": "audio",        # push-to-talk = nota de voz
    "voice": "audio",
    "video": "video",
    "document": "document",
    "location": "location",
    "sticker": "sticker",
}

# Tipos que NO son texto ni audio → se guarda solo metadata (FR-016)
NON_PROCESSED_TYPES = {"image", "video", "document", "location", "sticker"}


class WahaMessagePayload(BaseModel):
    """`payload` de un evento 'message' de WAHA. Campos mínimos del contrato."""

    model_config = ConfigDict(extra="allow")  # conservar todo lo demás para `raw`

    id: str                                          # wa_message_id (requerido — idempotencia)
    chat_id: str = Field(alias="from")               # ..@g.us (grupo) o ..@c.us (1:1)
    participant: str | None = None                   # en grupos: JID del remitente real
    from_me: bool = Field(default=False, alias="fromMe")
    raw_type: str = Field(default="chat", alias="type")
    body: str | None = None                          # texto o caption
    timestamp: int | None = None                     # epoch segundos
    has_media: bool = Field(default=False, alias="hasMedia")
    media_url: str | None = Field(default=None, alias="mediaUrl")
    mime_type: str | None = Field(default=None, alias="mimeType")
    quoted_msg_id: str | None = Field(default=None, alias="quotedMsgId")

    @property
    def type(self) -> str:
        """Tipo normalizado para `messages.type`."""
        return _WAHA_TYPE_MAP.get(self.raw_type, "other")

    @property
    def sender_jid(self) -> str:
        """Quién envió: en grupos es `participant`; en 1:1 es el chat."""
        return self.participant or self.chat_id

    @property
    def is_group(self) -> bool:
        return self.chat_id.endswith("@g.us")

    @property
    def wa_timestamp(self) -> datetime:
        """Hora real del mensaje como datetime tz-aware (UTC). Default: epoch 0 si falta."""
        return datetime.fromtimestamp(self.timestamp or 0, tz=timezone.utc)


class WahaEvent(BaseModel):
    """Envoltorio del evento que postea WAHA al webhook."""

    model_config = ConfigDict(extra="allow")

    event: str | None = None                         # 'message' | 'message.any' | 'session.status' | ...
    session: str | None = None                       # JID de la sesión (debe ser el número observador)
    payload: dict = Field(default_factory=dict)      # se parsea a WahaMessagePayload cuando aplica
