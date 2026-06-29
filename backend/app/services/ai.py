"""Gateway de LLM vía LiteLLM.

Gemini 2.0 Flash por defecto, pero CAMBIABLE a cualquier proveedor solo tocando
settings.llm_model (gemini/... · openai/gpt-4o · anthropic/claude-... ). El resto
del código no cambia. Multi-idioma: el prompt no asume idioma.
"""
import json

import litellm
import structlog

from app.core.config import settings

logger = structlog.get_logger()


async def classify_message(text: str) -> dict:
    """Clasifica un mensaje en importancia + categoría comercial (multi-idioma).

    TODO(F-001): afinar prompt, agregar extracción de cliente/producto y evento.
    """
    resp = await litellm.acompletion(
        model=settings.llm_model,
        api_key=settings.gemini_api_key or None,
        messages=[
            {
                "role": "system",
                "content": (
                    "Sos un analista comercial de seguros. Clasificá el mensaje "
                    "en JSON: {importance: red|yellow|white, category: "
                    "reclamo|pago|pregunta|oportunidad|renovacion|seguimiento|otro}. "
                    "Respondé en el idioma del mensaje. Solo JSON."
                ),
            },
            {"role": "user", "content": text},
        ],
        temperature=0,
    )
    content = resp["choices"][0]["message"]["content"]
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        logger.warning("ai.classify.parse_error", content=content)
        return {"importance": "white", "category": "otro"}
