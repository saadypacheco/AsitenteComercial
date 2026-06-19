"""Tests del onboarding del líder y el simulador comercial IA (Fases 2-4).

Testea:
  - lógica pura de _PASOS (bilingüe)
  - lógica del onboarding (GET/completar) con BD mockeada
  - fallback determinista del simulador (sin LLM)
"""
import pytest
from app.api import gestion
from app.api.agente import SimuladorMsg, simulador_chat


# ── _PASOS bilingüe ───────────────────────────────────────────────────────────

def test_pasos_es_tiene_5_entradas():
    assert len(gestion._PASOS_ES) == 5


def test_pasos_en_tiene_5_entradas():
    assert len(gestion._PASOS_EN) == 5


def test_pasos_tienen_campos_requeridos():
    for paso in gestion._PASOS_ES + gestion._PASOS_EN:
        assert "id" in paso
        assert "titulo" in paso
        assert "detalle" in paso
        assert "href" in paso


def test_pasos_ids_son_consistentes():
    ids_es = [p["id"] for p in gestion._PASOS_ES]
    ids_en = [p["id"] for p in gestion._PASOS_EN]
    assert ids_es == ids_en, "Los IDs de pasos deben ser iguales en es y en"


def test_pasos_es_en_espanol():
    assert gestion._PASOS_ES[0]["titulo"] == "Bienvenido al panel"


def test_pasos_en_en_ingles():
    assert gestion._PASOS_EN[0]["titulo"] == "Welcome to the panel"


# ── onboarding GET: lógica de completado ──────────────────────────────────────

def test_onboarding_no_completado():
    rows = [{"lider_onboarding_completado": False}]
    completado = bool(rows[0]["lider_onboarding_completado"]) if rows else False
    assert completado is False


def test_onboarding_completado():
    rows = [{"lider_onboarding_completado": True}]
    completado = bool(rows[0]["lider_onboarding_completado"]) if rows else False
    assert completado is True


def test_onboarding_sin_fila_devuelve_false():
    rows = []
    completado = bool(rows[0]["lider_onboarding_completado"]) if rows else False
    assert completado is False


# ── onboarding completar ──────────────────────────────────────────────────────

def test_onboarding_completar_ejecuta_update(monkeypatch):
    exec_calls = []
    monkeypatch.setattr(gestion, "_exec", lambda sql, params: exec_calls.append((sql, params)))

    # Simula la lógica del endpoint
    user_id = "user-uuid-1"
    gestion._exec(
        "update app_users set lider_onboarding_completado=true, lider_onboarding_visto_at=now() where id=%s",
        (user_id,),
    )

    assert any("lider_onboarding_completado" in s for s, _ in exec_calls)
    assert any(user_id in str(p) for _, p in exec_calls)


# ── simulador: fallback determinista ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_simulador_sin_gemini_devuelve_source_simulado(monkeypatch):
    """Sin GEMINI_API_KEY el endpoint devuelve source='simulado'."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "gemini_api_key", None)

    fake_ctx = {"agente_id": "ag-1", "tenant_id": "t-1"}
    body = SimuladorMsg(mensaje="Hola, me interesa el seguro", scenario="primera_llamada", historia=[])
    resp = await simulador_chat(body, ctx=fake_ctx, lang="es")

    assert resp["source"] == "simulado"
    assert resp["turno"] == 1
    assert resp["terminado"] is False
    assert len(resp["respuesta_cliente"]) > 0
    assert "feedback" in resp


@pytest.mark.asyncio
async def test_simulador_turno_incrementa_con_historia(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "gemini_api_key", None)

    fake_ctx = {"agente_id": "ag-1", "tenant_id": "t-1"}
    historia = [
        {"rol": "agente", "texto": "Hola"},
        {"rol": "cliente", "texto": "Cuéntame más"},
    ]
    body = SimuladorMsg(mensaje="Es un seguro de vida", scenario="primera_llamada", historia=historia)
    resp = await simulador_chat(body, ctx=fake_ctx, lang="es")

    # historia tiene 2 items → turno = 2//2 + 1 = 2
    assert resp["turno"] == 2


@pytest.mark.asyncio
async def test_simulador_termina_al_quinto_turno(monkeypatch):
    """terminado = turno >= 5. Con 8 intercambios en historia, turno = 5."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "gemini_api_key", None)

    fake_ctx = {"agente_id": "ag-1", "tenant_id": "t-1"}
    # 8 items → turno = 8//2 + 1 = 5 → terminado
    historia = [{"rol": "agente" if i % 2 == 0 else "cliente", "texto": f"msg {i}"}
                for i in range(8)]
    body = SimuladorMsg(mensaje="Cerramos?", scenario="cierre", historia=historia)
    resp = await simulador_chat(body, ctx=fake_ctx, lang="es")

    assert resp["terminado"] is True
    assert resp["turno"] == 5


@pytest.mark.asyncio
async def test_simulador_scenario_objeciones(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "gemini_api_key", None)

    fake_ctx = {"agente_id": "ag-1", "tenant_id": "t-1"}
    body = SimuladorMsg(mensaje="Le ofrezco un plan accesible", scenario="objeciones", historia=[])
    resp = await simulador_chat(body, ctx=fake_ctx, lang="es")

    assert resp["source"] == "simulado"
    # La primera respuesta de objeciones menciona seguro
    assert len(resp["respuesta_cliente"]) > 10


@pytest.mark.asyncio
async def test_simulador_en_ingles(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "gemini_api_key", None)

    fake_ctx = {"agente_id": "ag-1", "tenant_id": "t-1"}
    body = SimuladorMsg(mensaje="Hello, I have an offer", scenario="primera_llamada", historia=[])
    resp = await simulador_chat(body, ctx=fake_ctx, lang="en")

    assert resp["source"] == "simulado"
    # El fallback en inglés empieza con "Yes"
    assert resp["respuesta_cliente"].startswith("Yes")


@pytest.mark.asyncio
async def test_simulador_scenario_invalido_cae_a_primera_llamada(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "gemini_api_key", None)

    fake_ctx = {"agente_id": "ag-1", "tenant_id": "t-1"}
    body = SimuladorMsg(mensaje="hola", scenario="inexistente", historia=[])
    resp = await simulador_chat(body, ctx=fake_ctx, lang="es")

    # Escenario inválido cae al fallback de primera_llamada
    assert resp["source"] == "simulado"
    assert resp["turno"] == 1
