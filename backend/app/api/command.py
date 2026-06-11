"""Centro de Control Comercial — agrega todo lo que pinta el Inicio rediseñado:
KPIs con tendencia, recomendaciones de IA, estado del equipo, alertas enriquecidas,
ranking comercial, oportunidades y actividad. Deriva de datos reales (rebanada
F-002) + algunos campos sembrados para la demo (valor, cliente, VIP).

Filtrado por el tenant del JWT (FR-009). Etiquetas de catálogo como claves
(estado/prioridad/nivel) → las localiza el frontend; las frases (recomendaciones)
se arman en el idioma pedido acá.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.gestion import _exec, _rows, _scope
from app.core.auth import require_tenant, scoped_agente_ids, view_ctx
from app.core.config import settings

router = APIRouter()


# =============================================================================
# Detección de estancamiento / abandono de agentes
# Cruza tres señales que ya viven en la BD (sin tabla nueva, todo derivado en
# vivo como el resto del Centro de Control):
#   1) ACTIVIDAD   → días desde el último mensaje del agente en los grupos
#                    (fallback: días desde el alta si nunca escribió).
#   2) ASISTENCIA  → estancado en la ruta de onboarding + faltas a capacitaciones.
#   3) PRODUCCIÓN  → 0 cierres en 30 días (proxy hasta conectar WFG).
# Score determinista 0-100 → nivel alto/medio. Acotado por sub-árbol del líder.
# =============================================================================
def _riesgo_agentes(tenant: str, en: bool, scope: list[str] | None = None) -> list[dict]:
    scA, spA = _scope("a.id", scope)
    etapas_total = (_rows("select count(*) as n from capacitacion_etapas where tenant_id=%s", (tenant,))[0]["n"]) or 5

    rows = _rows(
        "select a.id, trim(a.nombre || ' ' || coalesce(a.apellido,'')) as nombre, "
        "coalesce("
        "  (extract(epoch from now() - (select max(m.wa_timestamp) from messages m "
        "    where m.sender_id=a.contact_id and m.tenant_id=%s))/86400)::int, "
        "  (extract(epoch from now() - a.fecha_alta::timestamptz)/86400)::int, 999) as dias_inactivo, "
        "(select count(*) from etapa_progreso p where p.agente_id=a.id and p.estado='completado') as etapas_ok, "
        "(select count(*) from pendientes p where p.agente_id=a.id and p.estado='cerrado' "
        "   and coalesce(p.fecha_cierre, p.created_at) >= now() - interval '30 days') as cierres, "
        "(select count(*) from capacitaciones k where k.tenant_id=%s and k.estado='finalizada' "
        "   and k.fecha >= now() - interval '60 days' "
        "   and not exists (select 1 from capacitacion_asistencia x "
        "     where x.capacitacion_id=k.id and x.agente_id=a.id and x.asistio)) as faltas "
        f"from agentes a where a.tenant_id=%s and a.estado<>'baja'{scA}",
        (tenant, tenant, tenant, *spA),
    )

    out: list[dict] = []
    for r in rows:
        d = r["dias_inactivo"]
        score = 0
        senales: list[str] = []

        # 1) Inactividad (señal más fuerte de abandono)
        if d >= 14:
            score += 45
            senales.append(f"{d} days inactive" if en else f"{d} días sin actividad")
        elif d >= 7:
            score += 25
            senales.append(f"{d} days inactive" if en else f"{d} días sin actividad")

        # 2) Estancado en onboarding / asistencia
        if r["etapas_ok"] == 0 and d >= 10:
            score += 30
            senales.append("Never started onboarding" if en else "No arrancó el onboarding")
        elif r["etapas_ok"] < etapas_total and d >= 7:
            score += 10
            senales.append(
                f"Stuck on step {r['etapas_ok']}/{etapas_total}" if en
                else f"Trabado en etapa {r['etapas_ok']}/{etapas_total}")
        if r["faltas"] >= 1:
            score += 10
            senales.append(
                f"Missed {r['faltas']} session(s)" if en else f"Faltó a {r['faltas']} capacitación(es)")

        # 3) Producción nula (proxy: pendientes cerrados)
        if r["cierres"] == 0:
            score += 20
            senales.append("No closes in 30 days" if en else "Sin cierres en 30 días")

        score = min(score, 100)
        nivel = "alto" if score >= 55 else "medio" if score >= 30 else None
        if not nivel:
            continue
        out.append({
            "id": r["id"], "nombre": r["nombre"], "score": score, "nivel": nivel,
            "tono": "danger" if nivel == "alto" else "warning",
            "dias_inactivo": d, "senales": senales,
        })

    out.sort(key=lambda x: x["score"], reverse=True)
    return out


@router.get("/dashboard/riesgo-agentes")
def riesgo_agentes(ctx: dict = Depends(view_ctx), lang: str = "es") -> list:
    return _riesgo_agentes(ctx["tenant_id"], lang == "en", scoped_agente_ids(ctx["tenant_id"], ctx["scope_root"]))


# =============================================================================
# Bandeja de acciones de la IA — "el asistente que ACTÚA"
# Sugiere acciones con el mensaje ya redactado; al aprobar, las ejecuta
# (simulado hoy; real cuando esté el número WhatsApp / email conectado).
# =============================================================================
def _build_acciones(tenant: str, en: bool, scope: list[str] | None = None) -> list[dict]:
    out: list[dict] = []
    scPP, spPP = _scope("p.agente_id", scope)
    scA, spA = _scope("a.id", scope)

    # Ya ejecutadas en los últimos 7 días → no re-sugerir
    enviadas = {r["ref_id"] for r in _rows(
        "select ref_id from acciones_log where tenant_id=%s and created_at > now() - interval '7 days'", (tenant,))}

    cli = "coalesce(p.cliente_en, p.cliente)" if en else "coalesce(p.cliente, p.titulo)"
    pend = _rows(
        f"select p.id, {cli} as cliente, p.vip, "
        "round(extract(epoch from now()-p.created_at)/3600)::int as horas, "
        "nullif(trim(coalesce(a.nombre,'')||' '||coalesce(a.apellido,'')), '') as agente "
        "from pendientes p left join agentes a on a.id=p.agente_id "
        f"where p.tenant_id=%s and p.prioridad='critico' and p.estado='pendiente'{scPP} order by p.created_at",
        (tenant, *spPP),
    )
    for p in pend:
        ref = f"pend-{p['id']}"
        if ref in enviadas:
            continue
        agente = p["agente"] or ("the agent" if en else "el agente")
        if en:
            msg = (f"Hi {agente}, client {p['cliente']} has been waiting for a reply for {p['horas']}h. "
                   "Could you follow up today? Let me know if you need a hand. 💪")
            titulo, motivo = f"Message {agente}", f"{p['cliente']} · {p['horas']}h no reply" + (" · VIP" if p["vip"] else "")
        else:
            msg = (f"Hola {agente}, el cliente {p['cliente']} está esperando respuesta hace {p['horas']}h. "
                   "¿Podés darle seguimiento hoy? Si necesitás ayuda, avisame. 💪")
            titulo, motivo = f"Escribir a {agente}", f"{p['cliente']} · {p['horas']}h sin respuesta" + (" · VIP" if p["vip"] else "")
        out.append({"id": ref, "ref_id": ref, "tipo": "mensaje_agente", "prioridad": "alta", "tono": "danger",
                    "titulo": titulo, "destinatario": agente, "canal": "whatsapp", "motivo": motivo, "mensaje": msg})

    # Agente saturado → ofrecer ayuda / redistribuir
    sat = _rows(
        "select trim(a.nombre||' '||coalesce(a.apellido,'')) as nombre, "
        "(select count(*) from pendientes p where p.agente_id=a.id and p.estado<>'cerrado') as ab "
        f"from agentes a where a.tenant_id=%s and a.estado<>'baja'{scA} "
        "and (select count(*) from pendientes p where p.agente_id=a.id and p.estado<>'cerrado') >= 3 "
        "order by ab desc limit 2", (tenant, *spA),
    )
    for s in sat:
        ref = f"sat-{s['nombre']}"
        if ref in enviadas:
            continue
        if en:
            msg = f"Hi {s['nombre']}, I see you have {s['ab']} open items. Want me to reassign a couple so you can breathe? Great work 🙌"
            titulo, motivo = f"Support {s['nombre']}", f"Overloaded · {s['ab']} open items"
        else:
            msg = f"Hola {s['nombre']}, veo que tenés {s['ab']} pendientes abiertos. ¿Querés que te reasigne un par para descomprimir? Buen trabajo 🙌"
            titulo, motivo = f"Apoyar a {s['nombre']}", f"Saturada · {s['ab']} pendientes"
        out.append({"id": ref, "ref_id": ref, "tipo": "ayuda_agente", "prioridad": "media", "tono": "warning",
                    "titulo": titulo, "destinatario": s["nombre"], "canal": "whatsapp", "motivo": motivo, "mensaje": msg})

    # Agente en riesgo de abandono → reconectar (cruce actividad+onboarding+producción)
    for r in [x for x in _riesgo_agentes(tenant, en, scope) if x["nivel"] == "alto"][:2]:
        ref = f"riesgo-{r['id']}"
        if ref in enviadas:
            continue
        motivo_sen = " · ".join(r["senales"][:2])
        if en:
            msg = (f"Hi {r['nombre']}, I haven't seen you around lately and I want to make sure "
                   "you're doing OK. Is there anything blocking you? I'm here to help you get going again. 🤝")
            titulo, motivo = f"Reconnect with {r['nombre']}", f"Abandonment risk · {motivo_sen}"
        else:
            msg = (f"Hola {r['nombre']}, hace unos días que no te veo activa y quiero asegurarme de que "
                   "estés bien. ¿Hay algo que te esté trabando? Estoy para ayudarte a retomar. 🤝")
            titulo, motivo = f"Reconectar con {r['nombre']}", f"Riesgo de abandono · {motivo_sen}"
        out.append({"id": ref, "ref_id": ref, "tipo": "reconectar_agente", "prioridad": "alta", "tono": "danger",
                    "titulo": titulo, "destinatario": r["nombre"], "canal": "whatsapp", "motivo": motivo, "mensaje": msg})

    # Top oportunidad → seguimiento
    otit = "coalesce(title_en, title)" if en else "title"
    opp = _rows(
        f"select id, {otit} as titulo, coalesce(valor,0)::int as valor from commercial_events "
        "where tenant_id=%s and type in ('venta','consulta','seguimiento') and status='open' "
        "order by valor desc nulls last limit 2", (tenant,),
    )
    for o in opp:
        ref = f"opp-{o['id']}"
        if ref in enviadas:
            continue
        if en:
            msg = f"Following up on the opportunity '{o['titulo']}' (~${o['valor']:,} potential). Let's lock a next step this week."
            titulo, motivo = "Follow up opportunity", f"{o['titulo']} · ${o['valor']:,}"
        else:
            msg = f"Dando seguimiento a la oportunidad '{o['titulo']}' (~US${o['valor']:,} potencial). Cerremos un próximo paso esta semana."
            titulo, motivo = "Seguir oportunidad", f"{o['titulo']} · US${o['valor']:,}"
        out.append({"id": ref, "ref_id": ref, "tipo": "seguimiento_oportunidad", "prioridad": "media", "tono": "ok",
                    "titulo": titulo, "destinatario": o["titulo"], "canal": "email", "motivo": motivo, "mensaje": msg})

    return out


@router.get("/dashboard/acciones")
def acciones(ctx: dict = Depends(view_ctx), lang: str = "es") -> list:
    return _build_acciones(ctx["tenant_id"], lang == "en", scoped_agente_ids(ctx["tenant_id"], ctx["scope_root"]))


class AccionEjecutar(BaseModel):
    ref_id: str
    tipo: str
    destinatario: str
    canal: str
    mensaje: str


@router.post("/dashboard/acciones/ejecutar")
def ejecutar_accion(body: AccionEjecutar, tenant: str = Depends(require_tenant)) -> dict:
    """Aprueba y 'envía' la acción. Hoy modo simulado (registra); con el número/
    email conectado, acá se hace el envío real por WhatsApp/email."""
    modo = "simulado"  # TODO: enviar real vía WAHA (whatsapp) / SMTP (email) cuando esté conectado
    _exec(
        "insert into acciones_log (tenant_id, ref_id, tipo, destinatario, canal, mensaje, modo) "
        "values (%s,%s,%s,%s,%s,%s,%s)",
        (tenant, body.ref_id, body.tipo, body.destinatario, body.canal, body.mensaje, modo),
    )
    # Efecto: si la acción salía de un pendiente, lo movemos a 'en proceso'.
    if body.ref_id.startswith("pend-"):
        _exec("update pendientes set estado='en_proceso' where id=%s and tenant_id=%s",
              (body.ref_id[5:], tenant))
    return {"ok": True, "modo": modo}


@router.get("/dashboard/acciones/historial")
def acciones_historial(tenant: str = Depends(require_tenant)) -> list:
    return _rows(
        "select tipo, destinatario, canal, mensaje, modo, created_at from acciones_log "
        "where tenant_id=%s order by created_at desc limit 20", (tenant,),
    )


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
def command(ctx: dict = Depends(view_ctx), lang: str = "es") -> dict:
    en = lang == "en"
    tenant = ctx["tenant_id"]
    p = (tenant,)
    scope = scoped_agente_ids(tenant, ctx["scope_root"])
    scA, spA = _scope("a.id", scope)            # agentes
    scP, spP = _scope("agente_id", scope)       # pendientes (tabla)
    scPP, spPP = _scope("p.agente_id", scope)   # pendientes (alias p)

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
        f"select count(*) as n from pendientes where tenant_id=%s and prioridad='critico' and estado<>'cerrado'{scP}",
        (tenant, *spP),
    )[0]["n"]
    riesgo = _rows(
        f"select count(*) as n from pendientes where tenant_id=%s and estado<>'cerrado' "
        f"and prioridad in ('critico','alto') and cliente is not null{scP}",
        (tenant, *spP),
    )[0]["n"]
    ag = _rows(
        f"select count(*) filter (where a.estado='activo') as act, count(*) as total "
        f"from agentes a where a.tenant_id=%s and a.estado<>'baja'{scA}",
        (tenant, *spA),
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
        f"from agentes a where a.tenant_id=%s and a.estado<>'baja'{scA} order by abiertas desc, cerrados desc",
        (tenant, *spA),
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
        f"from agentes a where a.tenant_id=%s and a.estado<>'baja'{scA} order by ventas desc, interacciones desc limit 5",
        (tenant, tenant, *spA),
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
        f"where p.tenant_id=%s and p.prioridad='critico' and p.estado<>'cerrado'{scPP} "
        "order by p.created_at limit 6", (tenant, *spPP),
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
