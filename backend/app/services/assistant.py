"""Cerebro del asistente conversacional (Telegram / web).

Responde preguntas sobre los datos del tenant reusando `executive_summary` (el mismo
agregado del dashboard) + LLM. Sin GEMINI_API_KEY cae a una respuesta determinista
(la demo nunca se rompe). Es el equivalente de `/dashboard/ai/ask`, pero invocable
desde cualquier canal (no solo HTTP).
"""
import json

import structlog

from app.core.config import settings

logger = structlog.get_logger()


def _pg():
    import psycopg

    if not settings.database_url:
        raise RuntimeError("DATABASE_URL no configurado")
    return psycopg.connect(settings.database_url, autocommit=True)


def _facts(tenant_id: str, lang: str) -> dict:
    with _pg() as c, c.cursor() as cur:
        cur.execute("select executive_summary(%s, %s)", (tenant_id, lang))
        row = cur.fetchone()
        d = row[0] if row and row[0] else {}
        return d if isinstance(d, dict) else json.loads(d)


async def answer(tenant_id: str, question: str, lang: str = "es") -> str:
    """Responde la pregunta usando los datos del tenant. LLM si hay key, si no reglas."""
    data = _facts(tenant_id, lang)
    idioma = "English" if lang == "en" else "español"

    if settings.gemini_api_key:
        try:
            import litellm

            resp = await litellm.acompletion(
                model=settings.llm_model,
                api_key=settings.gemini_api_key,
                messages=[
                    {"role": "system", "content": (
                        f"Sos el asistente de inteligencia comercial de la líder. Respondé en {idioma}, "
                        "breve y claro, USANDO solo los datos JSON provistos. Si el dato no está, decilo.")},
                    {"role": "user", "content": f"DATOS:\n{json.dumps(data, ensure_ascii=False, default=str)}\n\nPREGUNTA: {question}"},
                ],
                temperature=0.3,
            )
            return resp["choices"][0]["message"]["content"].strip()
        except Exception as exc:  # noqa: BLE001
            logger.warning("assistant.llm_error", error=str(exc))

    # Fallback determinista (sin key o si el LLM falla).
    p, pend = data.get("pulso", {}), data.get("pendientes", {})
    nop = len(data.get("oportunidades", []))
    if lang == "en":
        return (f"Today there were {p.get('mensajes_hoy', 0)} messages across {p.get('grupos_activos', 0)} "
                f"groups. {pend.get('total', 0)} open items ({pend.get('criticos', 0)} critical) and {nop} "
                "opportunities. (Set GEMINI_API_KEY for AI answers.)")
    return (f"Hoy hubo {p.get('mensajes_hoy', 0)} mensajes en {p.get('grupos_activos', 0)} grupos. "
            f"Hay {pend.get('total', 0)} pendientes abiertos ({pend.get('criticos', 0)} críticos) y {nop} "
            "oportunidades. (Configurá GEMINI_API_KEY para respuestas con IA.)")
