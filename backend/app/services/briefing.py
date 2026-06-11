"""Briefing diario por WhatsApp a la dueña (Feature E).

Arma un resumen del día en texto plano (formato WhatsApp, bilingüe) a partir del
agregado real `executive_summary()` + una señal de agentes en riesgo, y lo envía
por WAHA (services/waha.py; modo simulado mientras no haya número conectado).

IMPORTANTE: este módulo lo importa el worker, que corre en un contenedor slim SIN
FastAPI ni litellm. Por eso NO importa nada de app.api.* — usa psycopg directo y
funciones SQL. El texto es DETERMINISTA (no depende del LLM): la demo nunca se rompe.

Disparo automático: `tick()` (lo llama el loop del worker) envía una vez por día,
por tenant, cuando la hora ET alcanza `tenants.briefing_hora`. Idempotente por la
bitácora `briefing_log` (un envío 'auto' por día).
"""
import json

import structlog

from app.core.config import settings
from app.services import waha

logger = structlog.get_logger()


def _conn():
    import psycopg

    if not settings.database_url:
        raise RuntimeError("DATABASE_URL no configurado")
    return psycopg.connect(settings.database_url, autocommit=True)


def _agentes_en_riesgo(cur, tenant_id: str) -> int:
    """Cuántos agentes están fuertemente inactivos (≥14 días sin escribir).
    Señal compacta del módulo de estancamiento, embebida en el briefing."""
    cur.execute(
        "select count(*) from agentes a where a.tenant_id=%s and a.estado<>'baja' and coalesce("
        "  (extract(epoch from now() - (select max(m.wa_timestamp) from messages m "
        "    where m.sender_id=a.contact_id and m.tenant_id=%s))/86400), "
        "  (extract(epoch from now() - a.fecha_alta::timestamptz)/86400), 999) >= 14",
        (tenant_id, tenant_id),
    )
    return cur.fetchone()[0] or 0


def compose_text(tenant_id: str, lang: str = "es") -> str:
    """Compone el texto del briefing del día. Determinista, listo para WhatsApp."""
    en = lang == "en"
    with _conn() as c, c.cursor() as cur:
        cur.execute("select executive_summary(%s, %s)", (tenant_id, "en" if en else "es"))
        row = cur.fetchone()
        data = row[0] if row and row[0] else {}
        if isinstance(data, str):
            data = json.loads(data)
        riesgo = _agentes_en_riesgo(cur, tenant_id)

    pulso = data.get("pulso", {})
    salud = data.get("salud", {})
    pend = data.get("pendientes", {})
    alertas = data.get("alertas", []) or []
    op = data.get("oportunidades", []) or []
    fecha = data.get("fecha_et", "")
    delta = pulso.get("delta_pct")
    msgs = pulso.get("mensajes_hoy", 0)
    grupos = pulso.get("grupos_activos", 0)
    crit = pend.get("criticos", 0)

    if delta is None:
        delta_str = ""
    elif en:
        delta_str = f" ({'+' if delta >= 0 else ''}{delta}% vs yesterday)"
    else:
        delta_str = f" ({'+' if delta >= 0 else ''}{delta}% vs ayer)"

    L: list[str] = []
    if en:
        L.append(f"☀️ Good morning, Cecilia — your daily brief for {fecha}")
        L.append("")
        L.append(f"📊 Activity: {msgs} messages across {grupos} groups{delta_str}")
        L.append(f"🩺 Team health: {salud.get('label', '—')}")
        L.append(f"🔴 Critical pending items: {crit}")
        L.append(f"💼 Opportunities detected: {len(op)}")
        if riesgo:
            L.append(f"🚨 Agents at risk of dropping off: {riesgo}")
        if alertas:
            L.append("")
            L.append("🔔 Top alerts:")
            for a in alertas[:2]:
                L.append(f"   • {a.get('titulo')}: {a.get('detalle')}")
        L.append("")
        L.append("Want me to send the reminders to the agents? Reply *YES* and I'll fire them off for you. 🤝")
        L.append("— Your commercial assistant")
    else:
        L.append(f"☀️ Buenos días, Cecilia — tu resumen del {fecha}")
        L.append("")
        L.append(f"📊 Actividad: {msgs} mensajes en {grupos} grupos{delta_str}")
        L.append(f"🩺 Salud del equipo: {salud.get('label', '—')}")
        L.append(f"🔴 Pendientes críticos: {crit}")
        L.append(f"💼 Oportunidades detectadas: {len(op)}")
        if riesgo:
            L.append(f"🚨 Agentes en riesgo de abandono: {riesgo}")
        if alertas:
            L.append("")
            L.append("🔔 Alertas principales:")
            for a in alertas[:2]:
                L.append(f"   • {a.get('titulo')}: {a.get('detalle')}")
        L.append("")
        L.append("¿Querés que les mande los recordatorios a los agentes? Respondé *SÍ* y los disparo por vos. 🤝")
        L.append("— Tu asistente comercial")
    return "\n".join(L)


def _owner_jid(cur, tenant_id: str) -> str | None:
    cur.execute("select owner_wa_jid from tenants where id=%s", (tenant_id,))
    row = cur.fetchone()
    return row[0] if row else None


def send_now(tenant_id: str, lang: str = "es", tipo: str = "manual") -> dict:
    """Compone y envía el briefing AHORA (botón de prueba / disparo manual).
    Devuelve {texto, modo, ok, jid}. Registra en briefing_log."""
    texto = compose_text(tenant_id, lang)
    with _conn() as c, c.cursor() as cur:
        jid = _owner_jid(cur, tenant_id)
        res = waha.send_text(jid, texto) if jid else {"modo": "error", "ok": False}
        cur.execute(
            "insert into briefing_log (tenant_id, fecha, tipo, jid, modo, texto) "
            "values (%s, (now() at time zone %s)::date, %s, %s, %s, %s)",
            (tenant_id, settings.business_tz, tipo, jid, res["modo"], texto),
        )
    logger.info("briefing.send", tenant=tenant_id, tipo=tipo, modo=res["modo"], jid=jid)
    return {"texto": texto, "modo": res["modo"], "ok": res["ok"], "jid": jid}


def tick(lang: str = "es") -> int:
    """Disparo programado: envía el briefing 'auto' del día a cada tenant que toque.
    Idempotente (no reenvía si ya hay uno 'auto' para hoy ET). Devuelve cuántos envió.

    Lo llama el loop del worker cada ~minuto; el costo real solo ocurre una vez/día
    por tenant cuando se cumple la hora."""
    enviados = 0
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            "select t.id from tenants t "
            "where t.briefing_enabled and t.owner_wa_jid is not null "
            "  and extract(hour from (now() at time zone %s)) >= t.briefing_hora "
            "  and not exists (select 1 from briefing_log b where b.tenant_id=t.id "
            "    and b.tipo='auto' and b.fecha=(now() at time zone %s)::date)",
            (settings.business_tz, settings.business_tz),
        )
        due = [str(r[0]) for r in cur.fetchall()]
    for tenant_id in due:
        try:
            send_now(tenant_id, lang, tipo="auto")
            enviados += 1
        except Exception as exc:  # noqa: BLE001 — aislar por tenant
            logger.warning("briefing.tick_error", tenant=tenant_id, error=str(exc))
    if enviados:
        logger.info("briefing.tick", enviados=enviados)
    return enviados
