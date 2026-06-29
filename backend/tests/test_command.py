"""Tests del Centro de Control: delta de tendencia + regresiones de robustez.

Regresión BUG-2026-06-25: /dashboard/command fallaba con 500 (CORS visible en
el browser) cuando psycopg lanzaba OperationalError por conexión stale. El fix
vive en pool.py (check=), pero estos tests verifican que las funciones de datos
propagan correctamente las excepciones de BD para que sean visibles y tratables.
"""
import pytest

from app.api.command import _build_recomendaciones, _delta


# ── Tendencia (delta %) ────────────────────────────────────────────────────────

def test_delta_positivo_negativo():
    assert _delta(120, 100) == 20
    assert _delta(80, 100) == -20


def test_delta_sin_base_es_none():
    # sin referencia de ayer no hay porcentaje (evita división por cero)
    assert _delta(5, 0) is None


def test_delta_igual_a_cero():
    assert _delta(0, 0) is None


def test_delta_sin_cambio():
    assert _delta(50, 50) == 0


# ── Recomendaciones (sin BD) ───────────────────────────────────────────────────

def test_recomendaciones_vacias_sin_datos():
    """Sin alertas, equipo ni oportunidades no debe explotar."""
    recs = _build_recomendaciones(en=False, alertas=[], equipo=[], oportunidades=[])
    assert recs == []


def test_recomendaciones_critico_genera_llamada():
    alerta = {"cliente": "Toyota", "titulo": "Seguimiento", "horas": 48, "vip": False}
    recs = _build_recomendaciones(en=False, alertas=[alerta], equipo=[], oportunidades=[])
    assert len(recs) >= 1
    assert "Toyota" in recs[0]["accion"]
    assert recs[0]["tono"] == "danger"


def test_recomendaciones_vip_incluye_etiqueta():
    alerta = {"cliente": "Cliente VIP", "titulo": "Urgente", "horas": 10, "vip": True}
    recs = _build_recomendaciones(en=False, alertas=[alerta], equipo=[], oportunidades=[])
    assert "VIP" in recs[0]["motivo"]


def test_recomendaciones_agente_saturado():
    agente = {"nombre": "María", "estado": "saturada", "abiertas": 5, "cerrados": 2}
    recs = _build_recomendaciones(en=False, alertas=[], equipo=[agente], oportunidades=[])
    saturado = next((r for r in recs if "María" in r["accion"]), None)
    assert saturado is not None
    assert saturado["tono"] == "warning"


def test_recomendaciones_en_ingles():
    alerta = {"cliente": "Acme", "titulo": "Follow up", "horas": 24, "vip": False}
    recs = _build_recomendaciones(en=True, alertas=[alerta], equipo=[], oportunidades=[])
    assert "Call" in recs[0]["accion"]
    assert "without response" in recs[0]["motivo"]


# ── Regresión: OperationalError de BD es visible (no se traga silenciosamente) ─

def test_command_endpoint_propaga_error_de_bd(monkeypatch):
    """Si _rows lanza una excepción de BD, ésta llega al caller (no se traga).

    El fix real (pool check=) evita que el error ocurra; este test asegura que
    si igual ocurre la excepción se propaga y FastAPI puede generar un 500 con
    las cabeceras CORS correctas (en vez de una respuesta sin headers).
    BUG-2026-06-25: el error se propagaba como 500 con CORS vacío en el browser.

    Usamos una excepción genérica para no depender de psycopg instalado localmente
    (psycopg_pool solo vive dentro del contenedor Docker).
    """
    class FakeOperationalError(Exception):
        """Simula psycopg.OperationalError sin importar el módulo real."""

    call_count = {"n": 0}

    def _rows_falla(*args, **kwargs):
        call_count["n"] += 1
        raise FakeOperationalError("server closed the connection unexpectedly")

    # _rows se importa directamente en command.py → hay que parchear ahí.
    import app.api.command as command_mod
    monkeypatch.setattr(command_mod, "_rows", _rows_falla)

    with pytest.raises(FakeOperationalError):
        command_mod._riesgo_agentes("tenant-1", en=False)

    assert call_count["n"] >= 1
