"""Tests de la base de conocimiento RAG (Fase 3).

Testea search_text (full-text) y coach_answer con BD y LLM mockeados.
"""
import pytest
from app.services import knowledge_base as kb

_DOCS = [
    {"titulo": "Seguro de Vida", "contenido": "El seguro protege a la familia.", "categoria": "producto"},
    {"titulo": "Objeción: Es caro", "contenido": "Reformulá el valor.", "categoria": "objeciones"},
]


# ── search_text (síncrono) ────────────────────────────────────────────────────

def test_search_text_devuelve_resultados(monkeypatch):
    monkeypatch.setattr(kb, "_rows", lambda sql, params: _DOCS)
    results = kb.search_text("seguro de vida")
    assert len(results) == 2
    assert results[0]["titulo"] == "Seguro de Vida"


def test_search_text_pregunta_vacia_devuelve_lista_vacia(monkeypatch):
    monkeypatch.setattr(kb, "_rows", lambda sql, params: _DOCS)
    results = kb.search_text("")
    assert results == []


def test_search_text_palabras_cortas_filtradas(monkeypatch):
    # "es" y "un" tienen <= 2 caracteres → query vacío → []
    llamadas = []
    monkeypatch.setattr(kb, "_rows", lambda sql, params: llamadas.append(sql) or [])
    results = kb.search_text("es un")
    assert results == []
    assert llamadas == []  # no debe ir a la BD


# ── search (híbrido, async) ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_search_sin_gemini_usa_texto(monkeypatch):
    async def fake_embed(text):
        return None
    monkeypatch.setattr(kb, "_embed", fake_embed)
    monkeypatch.setattr(kb, "_rows", lambda sql, params: _DOCS)
    results = await kb.search("seguro")
    assert len(results) > 0


@pytest.mark.asyncio
async def test_search_con_embedding_usa_vector(monkeypatch):
    vector = [0.1] * 1536

    async def fake_embed(text):
        return vector

    monkeypatch.setattr(kb, "_embed", fake_embed)
    monkeypatch.setattr(kb, "_rows", lambda sql, params: _DOCS)
    results = await kb.search("seguro")
    assert len(results) > 0


@pytest.mark.asyncio
async def test_search_vector_vacio_cae_a_texto(monkeypatch):
    """Si pgvector no devuelve nada, debe caer a tsvector."""
    vector = [0.0] * 1536
    call_count = [0]

    async def fake_embed(text):
        return vector

    def fake_rows(sql, params):
        call_count[0] += 1
        return [] if call_count[0] == 1 else _DOCS

    monkeypatch.setattr(kb, "_embed", fake_embed)
    monkeypatch.setattr(kb, "_rows", fake_rows)
    results = await kb.search("seguro")
    assert len(results) > 0


# ── coach_answer ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_coach_answer_sin_docs_devuelve_sin_resultados(monkeypatch):
    async def fake_search(q, tid, limit=4):
        return []
    monkeypatch.setattr(kb, "search", fake_search)
    resp = await kb.coach_answer("algo raro xyz", None)
    assert resp["source"] == "sin_resultados"
    assert resp["fuentes"] == []


@pytest.mark.asyncio
async def test_coach_answer_fallback_texto_cuando_no_hay_llm(monkeypatch):
    async def fake_search(q, tid, limit=4):
        return _DOCS
    monkeypatch.setattr(kb, "search", fake_search)

    from app.core.config import settings
    monkeypatch.setattr(settings, "gemini_api_key", None)

    resp = await kb.coach_answer("¿qué es el seguro de vida?", None)
    assert resp["source"] == "texto"
    assert "Seguro de Vida" in resp["answer"]
    assert resp["fuentes"] == ["Seguro de Vida", "Objeción: Es caro"]


@pytest.mark.asyncio
async def test_coach_answer_llm_responde(monkeypatch):
    async def fake_search(q, tid, limit=4):
        return _DOCS
    monkeypatch.setattr(kb, "search", fake_search)

    from app.core.config import settings
    monkeypatch.setattr(settings, "gemini_api_key", "fake-key")

    async def fake_completion(**kw):
        return {"choices": [{"message": {"content": "El seguro protege a tu familia."}}]}

    import litellm
    monkeypatch.setattr(litellm, "acompletion", fake_completion)

    resp = await kb.coach_answer("¿qué es el seguro de vida?", None)
    assert resp["source"] == "llm"
    assert "familia" in resp["answer"]


@pytest.mark.asyncio
async def test_coach_answer_llm_error_cae_a_texto(monkeypatch):
    """Si el LLM lanza excepción, debe responder con el texto del primer doc."""
    async def fake_search(q, tid, limit=4):
        return _DOCS
    monkeypatch.setattr(kb, "search", fake_search)

    from app.core.config import settings
    monkeypatch.setattr(settings, "gemini_api_key", "fake-key")

    async def fake_completion(**kw):
        raise Exception("timeout")

    import litellm
    monkeypatch.setattr(litellm, "acompletion", fake_completion)

    resp = await kb.coach_answer("seguro", None)
    assert resp["source"] == "texto"


@pytest.mark.asyncio
async def test_coach_answer_en_ingles(monkeypatch):
    async def fake_search(q, tid, limit=4):
        return _DOCS
    monkeypatch.setattr(kb, "search", fake_search)

    from app.core.config import settings
    monkeypatch.setattr(settings, "gemini_api_key", None)

    resp = await kb.coach_answer("what is life insurance?", None, lang="en")
    assert resp["source"] == "texto"
    assert "Based on our materials" in resp["answer"]
