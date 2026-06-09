"""Centro de Control Comercial — agrega todo lo que pinta el Inicio rediseñado:
KPIs con tendencia, recomendaciones de IA, estado del equipo, alertas enriquecidas,
ranking comercial, oportunidades y actividad. Deriva de datos reales (rebanada
F-002) + algunos campos sembrados para la demo (valor, cliente, VIP).

Filtrado por el tenant del JWT (FR-009). Etiquetas de catálogo como claves
(estado/prioridad/nivel) → las localiza el frontend; las frases (recomendaciones)
se arman en el idioma pedido acá.
"""
from fastapi import APIRouter, Depends

from app.api.gestion import _rows
from app.core.auth import require_tenant
from app.core.config import settings

router = APIRouter()


@router.get("/config/status")
def config_status(tenant: str = Depends(require_tenant)) -> dict:
    """Estado de configuración para Ajustes: si la IA real está activa, entorno."""
    return {
        "ia_enabled": bool(settings.gemini_api_key),
        "llm_model": settings.llm_model,
        "environment": settings.environment,
    }

TODAY = "date_trunc('day', now())"
YEST = "date_trunc('day', now()) - interval '1 day'"


def _delta(today: int, yest: int):
    if not yest:
        return None
    return round((today - yest) / yest * 100)


@router.get("/dashboard/command")
def command(tenant: str = Depends(require_tenant), lang: str = "es") -> dict:
    en = lang == "en"
    p = (tenant,)

    # ── KPIs ─────────────────────────────────────────────────────────────────
    conv = _rows(
        f"select "
        f"(select count(distinct chat_id) from messages where tenant_id=%s and wa_timestamp >= {TODAY}) as hoy, "
        f"(select count(distinct chat_id) from messages where tenant_id=%s and wa_timestamp >= {YEST} and wa_timestamp < {TODAY}) as ayer",
        (tenant, tenant),
    )[0]
    ventas = _rows(
        f"select count(*) as cnt, coalesce(sum(valor),0)::int as valor, "
        f"(select count(*) from commercial_events where tenant_id=%s and type='venta' and created_at >= {YEST} and created_at < {TODAY}) as ayer "
        f"from commercial_events where tenant_id=%s and type='venta' and created_at >= {TODAY}",
        (tenant, tenant),
    )[0]
    criticos = _rows(
        "select count(*) as n from pendientes where tenant_id=%s and prioridad='critico' and estado<>'cerrado'", p
    )[0]["n"]
    riesgo = _rows(
        "select count(*) as n from pendientes where tenant_id=%s and estado<>'cerrado' "
        "and prioridad in ('critico','alto') and cliente is not null", p
    )[0]["n"]
    ag = _rows(
        "select count(*) filter (where estado='activo') as act, count(*) as total "
        "from agentes where tenant_id=%s and estado<>'baja'", p
    )[0]

    kpis = {
        "conversaciones": {"value": conv["hoy"], "delta": _delta(conv["hoy"], conv["ayer"]), "tono": "brand"},
        "ventas": {"value": ventas["cnt"], "valor": ventas["valor"], "delta": _delta(ventas["cnt"], ventas["ayer"]), "tono": "ok"},
        "criticos": {"value": criticos, "tono": "danger"},
        "riesgo": {"value": riesgo, "tono": "warning"},
        "conectados": {"value": ag["act"], "total": ag["total"], "tono": "ok"},
    }

    # ── Estado del equipo ────────────────────────────────────────────────────
    equipo_raw = _rows(
        "select a.id, trim(a.nombre || ' ' || coalesce(a.apellido,'')) as nombre, "
        "(select count(*) from pendientes pp where pp.agente_id=a.id and pp.estado<>'cerrado') as abiertas, "
        "(select count(*) from pendientes pp where pp.agente_id=a.id and pp.estado='cerrado') as cerrados, "
        "(select count(*) from pendientes pp where pp.agente_id=a.id and pp.estado<>'cerrado' and pp.prioridad='critico') as crit "
        "from agentes a where a.tenant_id=%s and a.estado<>'baja' order by abiertas desc, cerrados desc", p
    )
    equipo = []
    for e in equipo_raw:
        if e["abiertas"] >= 3:
            estado, tono = "saturada", "danger"
        elif e["cerrados"] >= 10:
            estado, tono = "excelente", "ok"
        else:
            estado, tono = "normal", "brand"
        equipo.append({**e, "estado": estado, "tono": tono})

    # ── Ranking comercial ────────────────────────────────────────────────────
    ranking = _rows(
        "select trim(a.nombre || ' ' || coalesce(a.apellido,'')) as nombre, "
        "(select count(*) from messages m where m.sender_id=a.contact_id and m.tenant_id=%s "
        " and m.wa_timestamp >= now()-interval '7 days') as interacciones, "
        "(select count(*) from pendientes pp where pp.agente_id=a.id and pp.estado='cerrado') as ventas "
        "from agentes a where a.tenant_id=%s and a.estado<>'baja' order by ventas desc, interacciones desc limit 5",
        (tenant, tenant),
    )
    for r in ranking:
        base = (r["interacciones"] or 0) + (r["ventas"] or 0)
        r["conversiones"] = round((r["ventas"] or 0) / base * 100) if base else 0

    # ── Alertas enriquecidas (pendientes críticos abiertos) ──────────────────
    cli_expr = "coalesce(p.cliente_en, p.cliente)" if en else "coalesce(p.cliente, p.titulo_en, p.titulo)"
    tit_expr = "coalesce(p.titulo_en, p.titulo)" if en else "p.titulo"
    alertas = _rows(
        f"select p.id, {cli_expr} as cliente, {tit_expr} as titulo, p.prioridad, p.vip, "
        "round(extract(epoch from now()-p.created_at)/3600)::int as horas, "
        "nullif(trim(coalesce(a.nombre,'') || ' ' || coalesce(a.apellido,'')), '') as responsable "
        "from pendientes p left join agentes a on a.id=p.agente_id "
        "where p.tenant_id=%s and p.prioridad='critico' and p.estado<>'cerrado' "
        "order by p.created_at limit 6", p,
    )

    # ── Oportunidades enriquecidas ───────────────────────────────────────────
    otit = "coalesce(title_en, title)" if en else "title"
    odesc = "coalesce(description_en, description)" if en else "description"
    oportunidades = _rows(
        f"select id, {otit} as titulo, {odesc} as producto, importance as nivel, "
        "round(coalesce(confidence,0)*100)::int as probabilidad, coalesce(valor,0)::int as potencial "
        "from commercial_events where tenant_id=%s and type in ('venta','consulta','seguimiento') "
        "and status='open' order by valor desc nulls last, created_at desc limit 5", p,
    )

    # ── Actividad (serie de 7 días) ──────────────────────────────────────────
    serie = _rows(
        "select gs::date as dia, "
        "(select count(*) from messages m where m.tenant_id=%s and m.wa_timestamp >= gs and m.wa_timestamp < gs + interval '1 day') as msgs "
        "from generate_series(date_trunc('day',now())-interval '6 days', date_trunc('day',now()), interval '1 day') gs",
        p,
    )
    actividad = {"serie_7d": [s["msgs"] for s in serie], "total_7d": sum(s["msgs"] for s in serie)}

    # ── Recomendaciones IA (derivadas, localizadas) ──────────────────────────
    recomendaciones = _build_recomendaciones(en, alertas, equipo, oportunidades)

    return {
        "kpis": kpis,
        "recomendaciones": recomendaciones,
        "equipo": equipo,
        "ranking": ranking,
        "alertas": alertas,
        "oportunidades": oportunidades,
        "actividad": actividad,
    }


def _build_recomendaciones(en: bool, alertas: list, equipo: list, oportunidades: list) -> list:
    recs: list[dict] = []

    # 1-2) Pendientes críticos más antiguos
    for a in alertas[:2]:
        quien = a.get("cliente") or a.get("titulo")
        horas = a.get("horas") or 0
        if en:
            recs.append({"prioridad": "alta", "tono": "danger",
                         "accion": f"Call {quien}",
                         "motivo": f"{horas}h without response" + (" · VIP" if a.get("vip") else "")})
        else:
            recs.append({"prioridad": "alta", "tono": "danger",
                         "accion": f"Llamar a {quien}",
                         "motivo": f"{horas}h sin respuesta" + (" · VIP" if a.get("vip") else "")})

    # 3) Agente saturado
    sat = next((e for e in equipo if e["estado"] == "saturada"), None)
    if sat:
        if en:
            recs.append({"prioridad": "media", "tono": "warning",
                         "accion": f"Help {sat['nombre']}",
                         "motivo": f"Overloaded · {sat['abiertas']} open items"})
        else:
            recs.append({"prioridad": "media", "tono": "warning",
                         "accion": f"Ayudar a {sat['nombre']}",
                         "motivo": f"Sobrecargada · {sat['abiertas']} pendientes abiertos"})

    # 4) Mejor oportunidad por potencial
    if oportunidades:
        o = oportunidades[0]
        if en:
            recs.append({"prioridad": "media", "tono": "ok",
                         "accion": f"Follow up: {o['titulo']}",
                         "motivo": f"${o['potencial']:,} potential · {o['probabilidad']}% close"})
        else:
            recs.append({"prioridad": "media", "tono": "ok",
                         "accion": f"Seguir: {o['titulo']}",
                         "motivo": f"US${o['potencial']:,} potencial · {o['probabilidad']}% cierre"})

    return recs
