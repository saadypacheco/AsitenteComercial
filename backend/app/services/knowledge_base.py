"""Base de conocimiento RAG (Fase 3).

Búsqueda sobre `kb_documents`: texto completo (tsvector) como fallback,
vector (pgvector cosine) cuando hay embedding disponible. Genera la respuesta
con el asistente LLM enriquecido con contexto de la KB.
"""
import json

import structlog

from app.core.config import settings
from app.db import pool as _pool

logger = structlog.get_logger()


def _rows(sql: str, params: tuple = ()):
    return _pool.rows(sql, params)


def search_text(question: str, tenant_id: str | None = None, limit: int = 4) -> list[dict]:
    """Búsqueda full-text en la KB (fallback sin embeddings)."""
    query = " | ".join(w for w in question.split() if len(w) > 2)
    if not query:
        return []
    sc = "and tenant_id=%s " if tenant_id else ""
    params: tuple = (query, tenant_id, limit) if tenant_id else (query, limit)
    rows = _rows(
        "select titulo, contenido, categoria, "
        "ts_rank(ts, to_tsquery('spanish', %s)) as rank "
        "from kb_documents "
        f"where activo and ts @@ to_tsquery('spanish', %s) {sc}"
        "order by rank desc limit %s",
        (query, *params),
    )
    return [{"titulo": r["titulo"], "contenido": r["contenido"], "categoria": r["categoria"]} for r in rows]


async def _embed(text: str) -> list[float] | None:
    """Genera un embedding via Gemini (LiteLLM). None si no hay key o falla."""
    if not settings.gemini_api_key:
        return None
    try:
        import litellm

        resp = await litellm.aembedding(
            model="gemini/text-embedding-004",
            api_key=settings.gemini_api_key,
            input=[text[:8192]],
        )
        return resp["data"][0]["embedding"]
    except Exception as exc:  # noqa: BLE001
        logger.warning("kb.embed_error", error=str(exc))
        return None


async def search(question: str, tenant_id: str | None = None, limit: int = 4) -> list[dict]:
    """Búsqueda híbrida: vector si hay embedding, texto si no."""
    vector = await _embed(question)
    if vector is not None:
        sc = "and tenant_id=%s " if tenant_id else ""
        params: tuple = (str(vector), tenant_id, limit) if tenant_id else (str(vector), limit)
        rows = _rows(
            "select titulo, contenido, categoria "
            "from kb_documents "
            f"where activo and embedding is not null {sc}"
            "order by embedding <=> %s::vector limit %s",
            params,
        )
        if rows:
            return [{"titulo": r["titulo"], "contenido": r["contenido"], "categoria": r["categoria"]} for r in rows]
    return search_text(question, tenant_id, limit)


async def coach_answer(question: str, tenant_id: str | None, lang: str = "es") -> dict:
    """Respuesta del coach IA enriquecida con la KB.

    Retorna { answer, fuentes, source } donde source es 'llm' o 'texto'.
    """
    docs = await search(question, tenant_id)
    idioma = "English" if lang == "en" else "español"
    fuentes = [d["titulo"] for d in docs]

    if docs and settings.gemini_api_key:
        context = "\n\n---\n\n".join(f"[{d['categoria'].upper()}] {d['titulo']}\n{d['contenido']}" for d in docs)
        try:
            import litellm

            resp = await litellm.acompletion(
                model=settings.llm_model,
                api_key=settings.gemini_api_key,
                messages=[
                    {"role": "system", "content": (
                        f"Sos el coach de ventas del agente. Respondé en {idioma}, de forma clara y práctica. "
                        "Usá solo la información del contexto provisto. Si no tenés suficiente info, sugerí "
                        "que el agente consulte con su líder.")},
                    {"role": "user", "content": f"CONTEXTO:\n{context}\n\nPREGUNTA: {question}"},
                ],
                temperature=0.4,
                max_tokens=600,
            )
            return {"answer": resp["choices"][0]["message"]["content"].strip(), "fuentes": fuentes, "source": "llm"}
        except Exception as exc:  # noqa: BLE001
            logger.warning("kb.llm_error", error=str(exc))

    if docs:
        extracto = docs[0]["contenido"][:400]
        if lang == "en":
            answer = f"Based on our materials ({docs[0]['titulo']}): {extracto}{'...' if len(docs[0]['contenido']) > 400 else ''}"
        else:
            answer = f"Según nuestros materiales ({docs[0]['titulo']}): {extracto}{'...' if len(docs[0]['contenido']) > 400 else ''}"
        return {"answer": answer, "fuentes": fuentes, "source": "texto"}

    if lang == "en":
        answer = "I don't have specific information on that topic in the knowledge base. Ask your leader or check the official AIG materials."
    else:
        answer = "No tengo información específica sobre ese tema en la base de conocimiento. Consultá con tu líder o revisá los materiales oficiales de AIG."
    return {"answer": answer, "fuentes": [], "source": "sin_resultados"}
