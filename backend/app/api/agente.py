"""App del agente (Producto ③): login por magic link + su ruta de aprendizaje.

El agente entra con su celular o email (magic link, sin contraseña — encaja con el
bajo nivel técnico). La sesión lleva rol='agente' + agente_id; cada endpoint
devuelve SOLO lo del agente autenticado.
"""
import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.gestion import _exec, _rows
from app.core import auth as authcore
from app.core.config import settings
from app.services import email as email_svc

router = APIRouter()
logger = structlog.get_logger()


# ── Auth del agente (magic link) ──────────────────────────────────────────────
class AgenteRequest(BaseModel):
    identifier: str  # celular o email


class AgenteVerify(BaseModel):
    token: str


@router.post("/agente/auth/request")
def agente_request(body: AgenteRequest) -> dict:
    """Genera un magic link para el agente. Responde ok siempre (no filtra)."""
    ag = authcore.get_agente_by_identifier(body.identifier)
    resp: dict = {"ok": True, "ttl_minutes": settings.magic_ttl_minutes}
    if ag:
        token = authcore.make_magic_token({
            "id": ag["id"], "email": ag.get("email") or ag.get("celular") or str(ag["id"]),
            "tenant_id": ag["tenant_id"], "agente_id": ag["id"],
        })
        link = f"{settings.frontend_url}/agente/magic?token={token}"
        # "Primero mail": si el agente tiene email, le mandamos el enlace ahí.
        # (Celular/SMS queda para cuando se conecte un proveedor de SMS.)
        if ag.get("email"):
            email_svc.send_magic_link(ag["email"], link)
        if settings.environment == "development":
            resp["link"] = link
    return resp


@router.post("/agente/auth/verify")
def agente_verify(body: AgenteVerify) -> dict:
    try:
        payload = authcore.decode_magic_token(body.token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Enlace inválido o expirado") from exc
    aid = payload.get("agente_id")
    tid = payload.get("tenant_id")
    if not aid:
        raise HTTPException(status_code=401, detail="Enlace no es de agente")
    rows = _rows(
        "select id, tenant_id, nombre, apellido, email, celular from agentes "
        "where id = %s and tenant_id = %s and estado <> 'baja'",
        (aid, tid),
    )
    if not rows:
        raise HTTPException(status_code=401, detail="Agente no válido")
    a = rows[0]
    # TTL corto para tokens de agente (24h) — si el agente es dado de baja,
    # el acceso expira en máximo 24h sin necesidad de check DB en cada request.
    token = authcore.make_token(
        {
            "id": a["id"], "email": a.get("email") or a.get("celular") or str(a["id"]),
            "tenant_id": a["tenant_id"], "nombre": a["nombre"], "rol": "agente", "agente_id": a["id"],
        },
        ttl_hours=24,
    )
    return {"access_token": token, "agente": {"nombre": a["nombre"], "apellido": a["apellido"]}}


# ── Datos de la ruta del agente autenticado ──────────────────────────────────
def _ruta(aid: str, tenant: str, en: bool) -> dict:
    nombre_e = "coalesce(e.nombre_en, e.nombre)" if en else "e.nombre"
    etapas = _rows(
        f"select e.id, {nombre_e} as nombre, e.descripcion, e.orden, "
        "coalesce(p.estado, 'pendiente') as estado, p.completado_at "
        "from capacitacion_etapas e "
        "left join etapa_progreso p on p.etapa_id = e.id and p.agente_id = %s "
        "where e.tenant_id = %s order by e.orden",
        (aid, tenant),
    )
    total = len(etapas) or 1
    completadas = sum(1 for e in etapas if e["estado"] == "completado")
    actual = next((e for e in etapas if e["estado"] == "en_curso"), None)
    return {"etapas": etapas, "total": len(etapas), "completadas": completadas,
            "pct": round(completadas / total * 100), "actual_orden": actual["orden"] if actual else None}


@router.get("/agente/ruta")
def agente_ruta(ctx: dict = Depends(authcore.require_agent), lang: str = "es") -> dict:
    return _ruta(ctx["agente_id"], ctx["tenant_id"], lang == "en")


@router.post("/agente/ruta/avanzar")
def agente_avanzar(ctx: dict = Depends(authcore.require_agent)) -> dict:
    """Completa la etapa en curso y abre la siguiente (idempotente por etapa)."""
    aid, tenant = ctx["agente_id"], ctx["tenant_id"]
    r = _ruta(aid, tenant, False)
    actual = next((e for e in r["etapas"] if e["estado"] == "en_curso"), None)
    if not actual:
        # si no hay 'en_curso', abrir la primera pendiente
        actual = next((e for e in r["etapas"] if e["estado"] == "pendiente"), None)
        if actual:
            _exec(
                "insert into etapa_progreso (tenant_id, agente_id, etapa_id, estado) values (%s,%s,%s,'en_curso') "
                "on conflict (agente_id, etapa_id) do update set estado='en_curso'",
                (tenant, aid, actual["id"]),
            )
            return {"ok": True, "abierta": actual["orden"]}
        return {"ok": True, "completa": True}

    # completar la actual
    _exec(
        "insert into etapa_progreso (tenant_id, agente_id, etapa_id, estado, completado_at) "
        "values (%s,%s,%s,'completado', now()) on conflict (agente_id, etapa_id) "
        "do update set estado='completado', completado_at=now()",
        (tenant, aid, actual["id"]),
    )
    # abrir la siguiente
    siguiente = next((e for e in r["etapas"] if e["orden"] == actual["orden"] + 1), None)
    if siguiente:
        _exec(
            "insert into etapa_progreso (tenant_id, agente_id, etapa_id, estado) values (%s,%s,%s,'en_curso') "
            "on conflict (agente_id, etapa_id) do update set estado='en_curso'",
            (tenant, aid, siguiente["id"]),
        )
    return {"ok": True, "completada": actual["orden"], "abierta": siguiente["orden"] if siguiente else None}


@router.get("/agente/agenda")
def agente_agenda(ctx: dict = Depends(authcore.require_agent), lang: str = "es") -> list:
    """Próximas sesiones de capacitación (con Zoom) para la agenda del agente."""
    nombre = "coalesce(nombre_en, nombre)" if lang == "en" else "nombre"
    return _rows(
        f"select id, {nombre} as nombre, fecha, duracion_min, zoom_url, estado "
        "from capacitaciones where tenant_id = %s and fecha is not null "
        "and fecha >= now() - interval '12 hours' order by fecha limit 10",
        (ctx["tenant_id"],),
    )


@router.get("/agente/ranking")
def agente_ranking(ctx: dict = Depends(authcore.require_agent)) -> list:
    """Ranking del grupo por avance de la ruta (Score derivado). Marca 'yo'."""
    aid, tenant = ctx["agente_id"], ctx["tenant_id"]
    total = _rows("select count(*) as n from capacitacion_etapas where tenant_id = %s", (tenant,))[0]["n"] or 1
    rows = _rows(
        "select a.id, trim(a.nombre || ' ' || coalesce(a.apellido,'')) as nombre, "
        "(select count(*) from etapa_progreso p where p.agente_id=a.id and p.estado='completado') as completadas "
        "from agentes a where a.tenant_id = %s and a.estado <> 'baja' "
        "and exists (select 1 from etapa_progreso p where p.agente_id=a.id)", (tenant,),
    )
    for r in rows:
        pct = round(r["completadas"] / total * 100)
        r["score"] = min(100, round(60 + pct * 0.4))
        r["yo"] = str(r["id"]) == str(aid)
    rows.sort(key=lambda x: x["score"], reverse=True)
    for i, r in enumerate(rows):
        r["pos"] = i + 1
    return rows


# ── Gamificación / Journey a la primera venta (Producto ③, Fase 1) ───────────
# Deriva XP, nivel, hitos del journey, misiones y logros de los datos que YA existen
# (etapas, asistencia a Zoom, pendientes cerrados como proxy de venta). Sin tabla nueva.
_LEVEL_THRESH = [0, 300, 800, 1500, 2500]
_LEVEL_NAMES = {
    "es": ["Inicial", "Junior", "Senior", "Especialista", "Master"],
    "en": ["Starter", "Junior", "Senior", "Specialist", "Master"],
}


@router.get("/agente/journey")
def agente_journey(ctx: dict = Depends(authcore.require_agent), lang: str = "es") -> dict:
    en = lang == "en"
    aid, tenant = ctx["agente_id"], ctx["tenant_id"]

    def n(sql, params):
        return _rows(sql, params)[0]["n"] or 0

    total = n("select count(*) as n from capacitacion_etapas where tenant_id=%s", (tenant,)) or 1
    comp = n("select count(*) as n from etapa_progreso where agente_id=%s and estado='completado'", (aid,))
    en_curso = n("select count(*) as n from etapa_progreso where agente_id=%s and estado='en_curso'", (aid,))
    asist = n("select count(*) as n from capacitacion_asistencia where agente_id=%s and asistio", (aid,))
    cerr = n("select count(*) as n from pendientes where agente_id=%s and estado='cerrado'", (aid,))
    prox = n("select count(*) as n from capacitaciones where tenant_id=%s and fecha >= now() "
             "and estado in ('programada','en_curso')", (tenant,))
    ruta_pct = round(comp / total * 100)

    # XP determinista: etapas (100), Zoom (60), ventas/proxy (150).
    xp = comp * 100 + asist * 60 + cerr * 150
    names = _LEVEL_NAMES["en" if en else "es"]
    lvl = max(i for i, th in enumerate(_LEVEL_THRESH) if xp >= th)   # 0..4
    cur_th = _LEVEL_THRESH[lvl]
    if lvl < 4:
        span = _LEVEL_THRESH[lvl + 1] - cur_th
        level = {"n": lvl + 1, "name": names[lvl], "next_name": names[lvl + 1],
                 "xp_into": xp - cur_th, "xp_span": span, "pct_to_next": round((xp - cur_th) / span * 100)}
    else:
        level = {"n": 5, "name": names[4], "next_name": None, "xp_into": 0, "xp_span": 0, "pct_to_next": 100}

    def L(es_t, en_t):
        return en_t if en else es_t

    # Journey hacia la primera venta (hitos derivados de señales reales).
    steps = [
        ("welcome", "👋", L("Bienvenida", "Welcome"), True),
        ("training", "📚", L("Capacitación inicial", "Initial training"), comp >= 1),
        ("zoom", "🎥", L("Primera sesión Zoom", "First Zoom session"), asist >= 1),
        ("complete", "🎓", L("Capacitación completa", "Training complete"), comp >= total),
        ("sale", "💼", L("Primera venta", "First sale"), cerr >= 1),
        ("active", "⭐", L("Agente activo", "Active agent"), comp >= total and cerr >= 1),
    ]
    journey, current_set = [], False
    for key, ic, label, done in steps:
        cur = (not done) and (not current_set)
        if cur:
            current_set = True
        journey.append({"key": key, "icon": ic, "label": label, "done": done, "current": cur})

    # Misiones (derivadas, con estado de cumplimiento).
    missions = [{"icon": "🎯", "xp": 100, "done": en_curso == 0 and comp >= 1,
                 "label": L("Avanzá tu próxima etapa", "Advance your next stage")}]
    if prox:
        missions.append({"icon": "🎥", "xp": 60, "done": asist >= 1,
                         "label": L("Asistí a tu próxima sesión", "Attend your next session")})
    missions.append({"icon": "💼", "xp": 150, "done": cerr >= 1,
                     "label": L("Lográ tu primera venta", "Land your first sale")})

    achievements = [
        {"key": k, "icon": ic, "label": lb, "unlocked": u}
        for k, ic, lb, u in [
            ("iniciado", "🥇", L("Iniciado", "Started"), comp >= 1),
            ("zoom", "🎥", L("Primer Zoom", "First Zoom"), asist >= 1),
            ("mitad", "🚀", L("A mitad de camino", "Halfway"), ruta_pct >= 50),
            ("venta", "💼", L("Primera venta", "First sale"), cerr >= 1),
            ("completo", "🏆", L("Ruta completa", "Path complete"), ruta_pct >= 100),
        ]
    ]

    # Racha: días distintos con una etapa completada (proxy de actividad).
    racha = n("select count(distinct completado_at::date) as n from etapa_progreso "
              "where agente_id=%s and completado_at is not null", (aid,))
    # Resumen rápido (semana).
    etapas_sem = n("select count(*) as n from etapa_progreso where agente_id=%s and estado='completado' "
                   "and completado_at >= now() - interval '7 days'", (aid,))
    unlocked = sum(1 for a in achievements if a["unlocked"])
    resumen = {"etapas": comp, "zoom": asist, "ventas": cerr, "logros": unlocked,
               "etapas_semana": etapas_sem, "xp_semana": etapas_sem * 100}

    return {"xp": xp, "level": level, "ruta_pct": ruta_pct, "racha": racha, "resumen": resumen,
            "journey": journey, "missions": missions, "achievements": achievements}


@router.get("/agente/me")
def agente_me(ctx: dict = Depends(authcore.require_agent), lang: str = "es") -> dict:
    aid, tenant = ctx["agente_id"], ctx["tenant_id"]
    a = _rows(
        "select nombre, apellido, ciudad, region, fecha_alta, "
        "(current_date - fecha_alta) as dias_desde_alta "
        "from agentes where id = %s", (aid,),
    )[0]
    r = _ruta(aid, tenant, lang == "en")
    # Score derivado (demo): base + avance de ruta. El motor de Score real es del Producto ②.
    score = min(100, round(60 + r["pct"] * 0.4))
    cerrados = _rows("select count(*) as n from pendientes where agente_id=%s and estado='cerrado'", (aid,))[0]["n"]
    return {
        "nombre": a["nombre"], "apellido": a["apellido"], "ciudad": a["ciudad"],
        "dias_desde_alta": a["dias_desde_alta"], "score": score,
        "ruta_pct": r["pct"], "etapas_completadas": r["completadas"], "etapas_total": r["total"],
        "tareas_cerradas": cerrados,
    }


# ── Coach IA con RAG (Fase 3) ─────────────────────────────────────────────────

class CoachQuery(BaseModel):
    pregunta: str


class SimuladorMsg(BaseModel):
    mensaje: str
    scenario: str = "primera_llamada"
    historia: list[dict] = []   # [{ "rol": "agente"|"cliente", "texto": "..." }]


@router.post("/agente/simulador/chat")
async def simulador_chat(body: SimuladorMsg, ctx: dict = Depends(authcore.require_agent), lang: str = "es") -> dict:
    """Simulador comercial IA: el agente practica ventas contra un cliente virtual.

    El LLM juega el rol de prospecto con objeciones reales. Si no hay GEMINI_API_KEY,
    usa respuestas escritas para que la demo siempre funcione.
    Devuelve { respuesta_cliente, feedback, turno }.
    """
    from app.services import knowledge_base as kb

    en = lang == "en"
    turno = len(body.historia) // 2 + 1

    _ESCENARIOS = {
        "primera_llamada": ("un prospecto que no esperaba la llamada, algo ocupado, curioso pero escéptico sobre seguros. No rechaza de plano pero hace preguntas.", "Primera llamada en frío"),
        "objeciones": ("un cliente interesado pero con objeciones: 'es muy caro', 'necesito pensarlo', 'ya tengo seguro'. Cede gradualmente si el agente es convincente.", "Manejo de objeciones"),
        "cierre": ("un cliente que ya mostró interés y está evaluando. Listo para cerrar pero busca un último empujón o garantía.", "Cierre de venta"),
    }
    desc_cliente, titulo_escenario = _ESCENARIOS.get(body.scenario, _ESCENARIOS["primera_llamada"])

    fallback_responses = {
        "primera_llamada": [
            "Sí, ¿quién habla? Estoy un poco ocupado..." if not en else "Yes, who's calling? I'm a bit busy...",
            "No sé... nunca pensé mucho en seguros. ¿Por qué lo necesitaría?" if not en else "I don't know... never really thought about insurance. Why would I need it?",
            "¿Cuánto cuesta algo así? Porque si es muy caro no me interesa." if not en else "How much does something like that cost? If it's too expensive, I'm not interested.",
            "Bueno, quizás podría escuchar más. ¿Cuándo podría reunirnos?" if not en else "Well, maybe I could hear more. When could we meet?",
        ],
        "objeciones": [
            "Mire, ya tengo un seguro de vida. ¿Por qué cambiaría?" if not en else "Look, I already have life insurance. Why would I switch?",
            "Es que es muy caro para lo que ofrecen..." if not en else "It's just too expensive for what they offer...",
            "Necesito pensarlo, no tomo decisiones así de rápido." if not en else "I need to think about it, I don't make decisions that fast.",
            "¿Me podría dar algo por escrito para revisar con mi familia?" if not en else "Could you give me something in writing to review with my family?",
        ],
        "cierre": [
            "Sí, me interesa, pero ¿qué garantía tengo de que van a pagar si pasa algo?" if not en else "Yes, I'm interested, but what guarantee do I have that you'll pay if something happens?",
            "¿Y si pago un año y después no puedo seguir pagando?" if not en else "What if I pay for a year and then can't keep paying?",
            "Está bien, me convenciste. ¿Cómo empezamos?" if not en else "Alright, you convinced me. How do we start?",
        ],
    }

    idx = min(len(body.historia) // 2, 3)
    fallback = fallback_responses.get(body.scenario, fallback_responses["primera_llamada"])
    fallback_resp = fallback[idx] if idx < len(fallback) else ("Gracias, voy a considerar tu propuesta." if not en else "Thanks, I'll consider your proposal.")

    terminado = turno >= 5

    if not settings.gemini_api_key:
        feedback_texts = [
            "Buena apertura. Recordá presentarte siempre con nombre y empresa." if not en else "Good opening. Remember to always introduce yourself with name and company.",
            "Bien escuchado. Cuando el cliente objeta precio, reformulá el valor antes de bajar el costo." if not en else "Good listening. When the client objects on price, reframe the value before lowering the cost.",
            "Excelente manejo. La técnica de alternativas (¿martes o jueves?) acelera el cierre." if not en else "Excellent handling. The alternatives technique (Tuesday or Thursday?) accelerates closure.",
            "Vas bien. Cerrá con un resumen de beneficios antes de pedir el compromiso." if not en else "Going well. Close with a benefits summary before asking for commitment.",
        ]
        feedback = feedback_texts[min(idx, len(feedback_texts) - 1)]
        return {"respuesta_cliente": fallback_resp, "feedback": feedback, "turno": turno, "terminado": terminado, "source": "simulado"}

    try:
        import litellm

        idioma = "English" if en else "español rioplatense"
        sys_prompt = (
            f"Sos {desc_cliente} "
            f"Respondé siempre en {idioma}, en máximo 2-3 oraciones. "
            "No rompas el personaje. Si el agente hace un buen argumento, mostrá apertura gradual."
        )
        messages = [{"role": "system", "content": sys_prompt}]
        for h in body.historia[-6:]:
            messages.append({"role": "user" if h["rol"] == "agente" else "assistant", "content": h["texto"]})
        messages.append({"role": "user", "content": body.mensaje})

        resp_cliente = await litellm.acompletion(
            model=settings.llm_model, api_key=settings.gemini_api_key,
            messages=messages, temperature=0.7, max_tokens=200,
        )
        resp_texto = resp_cliente["choices"][0]["message"]["content"].strip()

        feedback_prompt = (
            f"En 1-2 oraciones, da feedback de coach al agente sobre lo que dijo: '{body.mensaje}'. "
            f"Scenario: {titulo_escenario}. Sé específico y constructivo. Respondé en {idioma}."
        )
        resp_feedback = await litellm.acompletion(
            model=settings.llm_model, api_key=settings.gemini_api_key,
            messages=[{"role": "user", "content": feedback_prompt}], temperature=0.4, max_tokens=150,
        )
        feedback = resp_feedback["choices"][0]["message"]["content"].strip()
        return {"respuesta_cliente": resp_texto, "feedback": feedback, "turno": turno, "terminado": terminado, "source": "llm"}
    except Exception as exc:  # noqa: BLE001
        logger.warning("simulador.llm_error", error=str(exc))
        return {"respuesta_cliente": fallback_resp, "feedback": "—", "turno": turno, "terminado": terminado, "source": "simulado"}


@router.get("/agente/notificaciones")
def agente_notificaciones(ctx: dict = Depends(authcore.require_agent)) -> list:
    """Mensajes internos recibidos por el agente autenticado."""
    return _rows(
        "select mi.id, mi.tipo, mi.titulo, mi.cuerpo, mi.leido, mi.created_at, "
        "       ra.titulo as reunion_titulo "
        "from mensajes_internos mi "
        "left join reunion_actas ra on ra.id = mi.reunion_acta_id "
        "where mi.destinatario_id = %s "
        "order by mi.created_at desc limit 30",
        (ctx["agente_id"],),
    )


@router.patch("/agente/notificaciones/{nid}/leer")
def agente_marcar_leido(nid: str, ctx: dict = Depends(authcore.require_agent)) -> dict:
    _exec(
        "update mensajes_internos set leido=true where id=%s and destinatario_id=%s",
        (nid, ctx["agente_id"]),
    )
    return {"ok": True}


@router.post("/agente/coach")
async def agente_coach(body: CoachQuery, ctx: dict = Depends(authcore.require_agent), lang: str = "es") -> dict:
    """Coach IA del agente: responde preguntas usando la base de conocimiento (RAG).

    Fuentes: kb_documents (productos, guiones, objeciones). Si hay GEMINI_API_KEY
    usa LLM con contexto; si no, retorna el fragmento más relevante por texto.
    """
    from app.services import knowledge_base

    tenant = ctx["tenant_id"]
    if not body.pregunta.strip():
        raise HTTPException(status_code=400, detail="Pregunta vacía")
    return await knowledge_base.coach_answer(body.pregunta.strip(), tenant, lang)
