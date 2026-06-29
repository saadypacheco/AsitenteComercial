"""Motor de reglas de automatización del agente (Fase 2).

Reglas basadas en días de inactividad y señales de onboarding:
  - R01: 5 días sin actividad → WhatsApp de motivación al agente
  - R02: 7 días sin actividad → tarea para el líder ("revisar agente")
  - R03: 10 días sin actividad + riesgo alto → escalar (pendiente crítico)
  - R04: 2+ etapas no completadas a tiempo → tarea "necesita mentor"

Cada regla tiene un 'cooldown' (no se repite antes de N días por agente).
La deduplicación vive en `rules_log`; los envíos van por WAHA (simulado si no hay número).
"""
import structlog

from app.db import pool as _pool
from app.services import waha

logger = structlog.get_logger()

_COOLDOWNS = {
    "inactivo_5d": 5,
    "inactivo_7d": 7,
    "inactivo_10d": 10,
    "mentor_2rep": 14,
}


def _rows(sql: str, params: tuple = ()):
    return _pool.rows(sql, params)


def _exec(sql: str, params: tuple = ()):
    return _pool.exec_(sql, params)


def _fired_recently(tenant_id: str, rule_id: str, agente_id: str, days: int) -> bool:
    rows = _rows(
        "select 1 from rules_log where tenant_id=%s and rule_id=%s and agente_id=%s "
        "and created_at > now() - make_interval(days => %s) limit 1",
        (tenant_id, rule_id, agente_id, days),
    )
    return bool(rows)


def _log(tenant_id: str, rule_id: str, agente_id: str, resultado: str) -> None:
    _exec(
        "insert into rules_log (tenant_id, rule_id, agente_id, resultado) values (%s,%s,%s,%s)",
        (tenant_id, rule_id, agente_id, resultado),
    )


def _send_wa(jid: str | None, msg: str) -> str:
    if not jid:
        return "simulado"
    result = waha.send_text(jid, msg)
    return result.get("modo", "simulado")


def _create_task(tenant_id: str, agente_id: str, titulo: str, prioridad: str = "alto") -> None:
    _exec(
        "insert into pendientes (tenant_id, agente_id, titulo, tipo, prioridad, estado, creado_por) "
        "values (%s,%s,%s,'tarea',%s,'pendiente','ia')",
        (tenant_id, agente_id, titulo, prioridad),
    )


def _phone_jid(celular: str | None) -> str | None:
    if not celular:
        return None
    phone = celular.strip().replace("+", "").replace(" ", "").replace("-", "")
    return f"{phone}@c.us" if phone else None


def _process_tenant(tenant_id: str) -> None:
    agentes = _rows(
        "select a.id, trim(coalesce(a.nombre,'')||' '||coalesce(a.apellido,'')) as nombre, a.celular, "
        "coalesce(extract(epoch from now() - max(m.created_at)) / 86400, 999)::int as dias_inactivo, "
        "a.superior_id "
        "from agentes a "
        "left join messages m on m.tenant_id=a.tenant_id "
        "  and (m.jid like '%%'||regexp_replace(coalesce(a.celular,''), '[^0-9]', '', 'g')||'%%') "
        "where a.tenant_id=%s and a.estado='activo' "
        "group by a.id",
        (tenant_id,),
    )

    for ag in agentes:
        aid = str(ag["id"])
        nombre = ag["nombre"] or "Agente"
        dias = ag["dias_inactivo"] or 0
        jid = _phone_jid(ag["celular"])

        # R01: 5 días sin actividad → WhatsApp motivacional
        if dias >= 5 and not _fired_recently(tenant_id, "inactivo_5d", aid, _COOLDOWNS["inactivo_5d"]):
            msg = (f"Hola {nombre}! 👋 Hace {dias} días que no te vemos en los grupos. "
                   "¿Todo bien? Estamos para ayudarte a retomar. 💪")
            resultado = _send_wa(jid, msg)
            _log(tenant_id, "inactivo_5d", aid, resultado)
            logger.info("rules.inactivo_5d", agente=nombre, dias=dias, resultado=resultado)

        # R02: 7 días sin actividad → tarea para el líder
        if dias >= 7 and not _fired_recently(tenant_id, "inactivo_7d", aid, _COOLDOWNS["inactivo_7d"]):
            _create_task(tenant_id, aid, f"Revisar situación de {nombre} — {dias} días sin actividad", "alto")
            _log(tenant_id, "inactivo_7d", aid, "tarea")
            logger.info("rules.inactivo_7d", agente=nombre, dias=dias)

        # R03: 10 días + riesgo alto → escalar
        if dias >= 10 and not _fired_recently(tenant_id, "inactivo_10d", aid, _COOLDOWNS["inactivo_10d"]):
            _create_task(tenant_id, aid, f"ESCALADO: {nombre} lleva {dias} días sin actividad — riesgo de abandono", "critico")
            _log(tenant_id, "inactivo_10d", aid, "escalado")
            logger.info("rules.inactivo_10d", agente=nombre, dias=dias)

    # R04: 2+ etapas de onboarding no avanzadas en 14 días → tarea "mentor"
    rezagados = _rows(
        "select a.id, trim(coalesce(a.nombre,'')||' '||coalesce(a.apellido,'')) as nombre, count(*) as pendientes "
        "from etapa_progreso ep "
        "join agentes a on a.id=ep.agente_id "
        "where ep.tenant_id=%s and ep.estado='pendiente' "
        "  and ep.created_at < now() - interval '14 days' "
        "group by a.id, a.nombre, a.apellido having count(*) >= 2",
        (tenant_id,),
    )
    for r in rezagados:
        aid = str(r["id"])
        if not _fired_recently(tenant_id, "mentor_2rep", aid, _COOLDOWNS["mentor_2rep"]):
            _create_task(tenant_id, aid, f"{r['nombre']} tiene {r['pendientes']} etapas de capacitación sin avanzar — asignar mentor", "medio")
            _log(tenant_id, "mentor_2rep", aid, "tarea")
            logger.info("rules.mentor", agente=r["nombre"], pendientes=r["pendientes"])


def tick() -> None:
    """Punto de entrada del worker: evalúa reglas para todos los tenants activos."""
    tenants = _rows("select id from tenants where activo is distinct from false")
    for row in tenants:
        try:
            _process_tenant(str(row["id"]))
        except Exception as exc:  # noqa: BLE001
            logger.warning("rules.tenant_error", tenant=str(row["id"]), error=str(exc))
