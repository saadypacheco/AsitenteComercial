"""Tests del motor de reglas de automatización (Fase 2).

Testea la lógica pura y el comportamiento con BD mockeada.
No toca Postgres: monkeypatcha _rows/_exec del módulo.
"""
import pytest
from app.services import rules_engine


# ── Helpers puros ─────────────────────────────────────────────────────────────

def test_phone_jid_formato_basico():
    assert rules_engine._phone_jid("5491100000000") == "5491100000000@c.us"


def test_phone_jid_limpia_signos():
    assert rules_engine._phone_jid("+54 911 000-0000") == "549110000000@c.us"


def test_phone_jid_none():
    assert rules_engine._phone_jid(None) is None
    assert rules_engine._phone_jid("") is None


# ── _fired_recently ────────────────────────────────────────────────────────────

def test_fired_recently_true_cuando_hay_fila(monkeypatch):
    monkeypatch.setattr(rules_engine, "_rows", lambda sql, params: [{"1": 1}])
    assert rules_engine._fired_recently("t1", "inactivo_5d", "a1", 5) is True


def test_fired_recently_false_cuando_vacio(monkeypatch):
    monkeypatch.setattr(rules_engine, "_rows", lambda sql, params: [])
    assert rules_engine._fired_recently("t1", "inactivo_5d", "a1", 5) is False


# ── _process_tenant: R01 dispara WhatsApp a agente inactivo 5d ─────────────────

def test_r01_dispara_whatsapp(monkeypatch):
    agente = {"id": "uuid-1", "nombre": "María López", "celular": "5491122334455",
              "dias_inactivo": 6, "superior_id": None}
    # BD: un agente inactivo, log vacío; rezagados (etapa_progreso) vacío
    monkeypatch.setattr(rules_engine, "_rows", lambda sql, params: (
        [agente] if "etapa_progreso" not in sql and "agentes" in sql else []
    ))
    exec_calls = []
    monkeypatch.setattr(rules_engine, "_exec", lambda sql, params: exec_calls.append(params))

    wa_calls = []
    monkeypatch.setattr(rules_engine.waha, "send_text",
                        lambda jid, msg: wa_calls.append((jid, msg)) or {"modo": "ok"})

    rules_engine._process_tenant("tenant-1")

    assert any("5491122334455@c.us" in str(c) for c in wa_calls), "R01 debe enviar WhatsApp"
    assert any("inactivo_5d" in str(c) for c in exec_calls), "R01 debe loguear en rules_log"


def test_r01_no_dispara_si_ya_fue(monkeypatch):
    """Si _fired_recently devuelve True, R01 no envía nada."""
    agente = {"id": "uuid-1", "nombre": "Juan", "celular": "5491100000000",
              "dias_inactivo": 6, "superior_id": None}
    monkeypatch.setattr(rules_engine, "_rows", lambda sql, params: (
        [agente] if "etapa_progreso" not in sql and "agentes" in sql
        else ([] if "etapa_progreso" in sql else [{"1": 1}])
    ))
    monkeypatch.setattr(rules_engine, "_exec", lambda sql, params: None)

    wa_calls = []
    monkeypatch.setattr(rules_engine.waha, "send_text",
                        lambda jid, msg: wa_calls.append((jid, msg)) or {})

    rules_engine._process_tenant("tenant-1")
    assert wa_calls == [], "R01 no debe reenviar si ya se disparó recientemente"


def test_r02_crea_tarea_7d(monkeypatch):
    """R02: 7+ días → crea pendiente para el líder."""
    agente = {"id": "uuid-2", "nombre": "Ana García", "celular": None,
              "dias_inactivo": 8, "superior_id": None}
    log_calls = []

    def fake_rows(sql, params):
        if "agentes" in sql:
            return [agente]
        if "rules_log" in sql and "inactivo_7d" in str(params):
            return []  # no disparado aún
        if "rules_log" in sql:
            return [{"1": 1}]  # otros ya disparados
        return []

    monkeypatch.setattr(rules_engine, "_rows", fake_rows)
    exec_sql = []
    monkeypatch.setattr(rules_engine, "_exec", lambda sql, params: exec_sql.append((sql, params)))
    monkeypatch.setattr(rules_engine.waha, "send_text", lambda j, m: {})

    rules_engine._process_tenant("tenant-1")

    tarea_creada = any("pendientes" in s for s, _ in exec_sql)
    assert tarea_creada, "R02 debe insertar en pendientes"


def test_r03_escala_a_critico_10d(monkeypatch):
    """R03: 10+ días → pendiente con prioridad 'critico'."""
    agente = {"id": "uuid-3", "nombre": "Luis", "celular": None,
              "dias_inactivo": 12, "superior_id": None}
    monkeypatch.setattr(rules_engine, "_rows", lambda sql, params: (
        [agente] if "etapa_progreso" not in sql and "agentes" in sql else []
    ))
    exec_calls = []
    monkeypatch.setattr(rules_engine, "_exec", lambda sql, params: exec_calls.append(params))
    monkeypatch.setattr(rules_engine.waha, "send_text", lambda j, m: {})

    rules_engine._process_tenant("tenant-1")

    critico = any("critico" in str(p) for p in exec_calls)
    assert critico, "R03 debe crear pendiente crítico"


def test_tick_itera_todos_los_tenants(monkeypatch):
    tenants = [{"id": "t1"}, {"id": "t2"}]
    processed = []
    monkeypatch.setattr(rules_engine, "_rows", lambda sql, params=(): tenants)
    monkeypatch.setattr(rules_engine, "_process_tenant",
                        lambda tid: processed.append(tid))

    rules_engine.tick()
    assert processed == ["t1", "t2"]


def test_tick_continua_si_un_tenant_falla(monkeypatch):
    tenants = [{"id": "t1"}, {"id": "t2"}]
    monkeypatch.setattr(rules_engine, "_rows", lambda sql, params=(): tenants)
    calls = []

    def fake_process(tid):
        if tid == "t1":
            raise RuntimeError("falla simulada")
        calls.append(tid)

    monkeypatch.setattr(rules_engine, "_process_tenant", fake_process)
    rules_engine.tick()  # no debe lanzar excepción
    assert "t2" in calls
