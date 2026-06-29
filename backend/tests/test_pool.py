"""Tests de regresión para la configuración del pool de BD.

BUG 2026-06-25: cuando Postgres cerraba una conexión ociosa el pool la
devolvía sin validar → psycopg.OperationalError en /dashboard/command con
CORS error visible en el navegador (el backend respondía 500 antes de que
el middleware CORS añadiera las cabeceras).

Fix aplicado: check=ConnectionPool.check_connection + reconnect_timeout=5.
Estos tests aseguran que si alguien toca pool.py la configuración no regrese
al estado roto.

Nota: psycopg_pool solo está instalado dentro del contenedor Docker, por eso
los tests inyectan un fake via sys.modules en vez de parchear el módulo real.
"""
import sys
import types
import pytest
import app.db.pool as pool_mod


def _fake_psycopg_pool_module():
    """Crea un módulo fake de psycopg_pool con un ConnectionPool capturador."""
    mod = types.ModuleType("psycopg_pool")

    captured = {}

    class _FakePool:
        check_connection = staticmethod(lambda conn: None)

        def __init__(self, *args, **kwargs):
            captured.update(kwargs)

    mod.ConnectionPool = _FakePool
    mod._captured = captured
    return mod


@pytest.fixture(autouse=True)
def _reset_pool(monkeypatch):
    """Resetea el pool global antes y después de cada test para evitar contaminación."""
    monkeypatch.setattr(pool_mod, "_pool", None)
    monkeypatch.setattr("app.core.config.settings.database_url", "postgresql://test/test")
    yield
    monkeypatch.setattr(pool_mod, "_pool", None)


def test_pool_creado_con_check_de_conexion(monkeypatch):
    """El pool debe validar cada conexión antes de entregarla al caller."""
    fake = _fake_psycopg_pool_module()
    monkeypatch.setitem(sys.modules, "psycopg_pool", fake)

    pool_mod.get_pool()

    assert "check" in fake._captured, (
        "Pool sin check= → conexiones stale no se detectan antes de usarse. "
        "Agregar check=ConnectionPool.check_connection en pool.py."
    )


def test_pool_creado_con_reconnect_timeout(monkeypatch):
    """El pool debe reintentar reconectar en vez de fallar inmediatamente."""
    fake = _fake_psycopg_pool_module()
    monkeypatch.setitem(sys.modules, "psycopg_pool", fake)

    pool_mod.get_pool()

    assert "reconnect_timeout" in fake._captured, (
        "Pool sin reconnect_timeout → ante una caída de BD falla al instante "
        "en vez de reintentar. Agregar reconnect_timeout en pool.py."
    )
    assert fake._captured["reconnect_timeout"] > 0


def test_pool_no_se_recrea_en_llamadas_sucesivas(monkeypatch):
    """get_pool() debe ser idempotente: devuelve el mismo objeto siempre."""
    init_count = {"n": 0}
    fake = _fake_psycopg_pool_module()
    original_init = fake.ConnectionPool.__init__

    class _CountingPool(fake.ConnectionPool):
        def __init__(self, *args, **kwargs):
            init_count["n"] += 1
            original_init(self, *args, **kwargs)

    fake.ConnectionPool = _CountingPool
    monkeypatch.setitem(sys.modules, "psycopg_pool", fake)

    p1 = pool_mod.get_pool()
    p2 = pool_mod.get_pool()

    assert p1 is p2
    assert init_count["n"] == 1, "ConnectionPool se instanció más de una vez (no es idempotente)"


def test_pool_falla_sin_database_url(monkeypatch):
    """Sin DATABASE_URL el pool debe lanzar RuntimeError, no un error críptico."""
    monkeypatch.setattr("app.core.config.settings.database_url", "")

    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        pool_mod.get_pool()
