"""Transcripción de audios SELF-HOSTED (faster-whisper). Multi-idioma, en tu Hostinger.

Los audios NO salen a un tercero — coherente con la decisión de autogestión del ADR.
Si el VPS no tiene GPU, corre en CPU (más lento pero viable para volumen moderado).
"""
from functools import lru_cache

import structlog

from app.core.config import settings

logger = structlog.get_logger()


@lru_cache(maxsize=1)
def _model():
    from faster_whisper import WhisperModel

    return WhisperModel(settings.whisper_model, device=settings.whisper_device, compute_type="int8")


def transcribe(audio_path: str) -> dict:
    """Devuelve {text, language, confidence}. Whisper detecta el idioma solo."""
    segments, info = _model().transcribe(audio_path, vad_filter=True)
    text = " ".join(seg.text.strip() for seg in segments).strip()
    logger.info("transcription.done", language=info.language, chars=len(text))
    return {
        "text": text,
        "language": info.language,
        "confidence": getattr(info, "language_probability", None),
        "engine": f"faster-whisper:{settings.whisper_model}",
    }
