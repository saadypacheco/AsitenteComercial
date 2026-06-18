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

# Claves de contenido dentro de `_data.message` (motor NOWEB) → tipo normalizado.
# Las que NO están acá (protocolMessage, senderKeyDistributionMessage, etc.) son
# metadata/protocolo → sin contenido = ruido.
_CONTENT_TYPES = {
    "conversation": "text",
    "extendedTextMessage": "text",
    "imageMessage": "image",
    "audioMessage": "audio",
    "videoMessage": "video",
    "documentMessage": "document",
    "stickerMessage": "sticker",
    "locationMessage": "location",
}


class WahaMessagePayload(BaseModel):
    """`payload` de un evento 'message' de WAHA.

    Soporta dos formas: el payload PLANO (versiones viejas / tests, con `type`) y el
    de **NOWEB** (real), donde el tipo, el remitente y el `pushName` viven anidados en
    `_data`. Las propiedades miran `_data` primero y caen al plano si no está.
    """

    model_config = ConfigDict(extra="allow")  # conservar todo lo demás para `raw`

    id: str                                          # wa_message_id (requerido — idempotencia)
    chat_id: str = Field(alias="from")               # ..@g.us (grupo) o ..@c.us / ..@lid (1:1)
    participant: str | None = None                   # plano: JID del remitente en grupos
    from_me: bool = Field(default=False, alias="fromMe")
    raw_type: str = Field(default="chat", alias="type")
    body: str | None = None                          # texto o caption
    timestamp: int | None = None                     # epoch segundos
    has_media: bool = Field(default=False, alias="hasMedia")
    media_url: str | None = Field(default=None, alias="mediaUrl")
    mime_type: str | None = Field(default=None, alias="mimeType")
    quoted_msg_id: str | None = Field(default=None, alias="quotedMsgId")
    data_: dict = Field(default_factory=dict, alias="_data")   # NOWEB: key/message/pushName

    @property
    def _message(self) -> dict:
        return self.data_.get("message") or {}

    @property
    def _key(self) -> dict:
        return self.data_.get("key") or {}

    @property
    def content_type(self) -> str | None:
        """Tipo de contenido según `_data.message` (NOWEB). None = sin contenido (ruido)."""
        for k, t in _CONTENT_TYPES.items():
            if k in self._message:
                return t
        return None

    @property
    def type(self) -> str:
        """Tipo normalizado para `messages.type`."""
        ct = self.content_type
        if ct:
            return ct
        if self.data_:                               # NOWEB sin contenido reconocido
            return "other"
        return _WAHA_TYPE_MAP.get(self.raw_type, "other")  # payload plano

    @property
    def is_noise(self) -> bool:
        """True para estados (status@broadcast) y mensajes de protocolo/sync (sin
        contenido de chat). No se capturan: no son conversación real."""
        if self.chat_id == "status@broadcast" or self.chat_id.endswith("@broadcast"):
            return True
        if self.data_ and self.content_type is None:
            return True                              # _data sin contenido = protocolMessage/sync
        return False

    @property
    def text(self) -> str | None:
        """Texto del mensaje: body plano, o conversation/extendedText del NOWEB."""
        if self.body:
            return self.body
        msg = self._message
        if "conversation" in msg:
            return msg["conversation"]
        if "extendedTextMessage" in msg:
            return (msg["extendedTextMessage"] or {}).get("text")
        return None

    @property
    def sender_jid(self) -> str:
        """Quién envió, preferiendo el NÚMERO REAL sobre el identificador `@lid`."""
        key = self._key
        if key:
            if self.is_group:
                return key.get("participantAlt") or key.get("participant") or self.chat_id
            return key.get("remoteJidAlt") or self.chat_id
        return self.participant or self.chat_id      # payload plano

    @property
    def push_name(self) -> str | None:
        return self.data_.get("pushName") or None

    @property
    def is_group(self) -> bool:
        return self.chat_id.endswith("@g.us")

    @property
    def wa_timestamp(self) -> datetime:
        """Hora real del mensaje como datetime tz-aware (UTC). Default: epoch 0 si falta."""
        ts = self.timestamp or self.data_.get("messageTimestamp") or 0
        return datetime.fromtimestamp(int(ts), tz=timezone.utc)


class WahaEvent(BaseModel):
    """Envoltorio del evento que postea WAHA al webhook."""

    model_config = ConfigDict(extra="allow")

    event: str | None = None                         # 'message' | 'message.any' | 'session.status' | ...
    session: str | None = None                       # JID de la sesión (debe ser el número observador)
    payload: dict = Field(default_factory=dict)      # se parsea a WahaMessagePayload cuando aplica
