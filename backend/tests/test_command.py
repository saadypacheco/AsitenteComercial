"""Tests del Centro de Control: cálculo de tendencia (delta vs ayer)."""
from app.api.command import _delta


def test_delta_positivo_negativo():
    assert _delta(120, 100) == 20
    assert _delta(80, 100) == -20


def test_delta_sin_base_es_none():
    # sin referencia de ayer no hay porcentaje (evita división por cero)
    assert _delta(5, 0) is None
