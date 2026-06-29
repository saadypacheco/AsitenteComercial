"""API de gestión (rebanada F-002): CRUD de pendientes/acciones + lista de agentes.

Todo filtrado por el tenant del JWT (FR-009). Las etiquetas de catálogo
(tipo/prioridad/estado) viajan como claves y las localiza el frontend; los textos
libres (título) se devuelven en el idioma pedido cuando hay traducción (titulo_en).
"""
import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import secrets

from app.core.auth import (
    assert_agente_in_scope, current_user, hash_password, require_owner, require_tenant, scoped_agente_ids, view_ctx,
)
from app.core.config import settings
from app.services import zoom

router = APIRouter()
logger = structlog.get_logger()


def _scope(col: str, scope: list[str] | None):
    """Devuelve (fragmento_sql, params) para acotar por sub-árbol del líder."""
    if scope is None:
        return "", []
    return f" and {col} = any(%s::uuid[])", [scope]

PRIORIDADES = ("critico", "alto", "medio", "bajo")
ESTADOS = ("pendiente", "en_proceso", "cerrado")
TIPOS = ("seguimiento", "reclamo", "consulta", "tarea", "oportunidad")


# Acceso a la BD vía pool compartido (reusa conexiones calientes — clave contra
# Supabase Cloud, donde abrir una conexión nueva por consulta cuesta cientos de ms).
from app.db import pool as _pool


def _rows(sql: str, params: tuple = ()):  # -> list[dict]
    return _pool.rows(sql, params)


def _exec(sql: str, params: tuple = ()):
    return _pool.exec_(sql, params)


# ── Agentes (lista + mapa + CRUD) ─────────────────────────────────────────────
ESTADOS_AGENTE = ("activo", "inactivo", "baja")


@router.get("/gestion/agentes")
def list_agentes(ctx: dict = Depends(view_ctx)) -> list:
    """Agentes activos/inactivos con datos de contacto + coordenadas. Acotado al
    equipo del líder (sub-árbol); el owner ve todos."""
    tenant = ctx["tenant_id"]
    sc, sp = _scope("a.id", scoped_agente_ids(tenant, ctx["scope_root"]))
    return _rows(
        "select a.id, a.nombre, a.apellido, a.celular, a.email, a.estado, a.ciudad, "
        "a.region, a.idioma, a.superior_id, a.lat, a.lng, "
        "(select count(*)::int from pendientes p where p.agente_id = a.id and p.estado <> 'cerrado') as abiertas, "
        "(select count(*)::int from pendientes p where p.agente_id = a.id and p.estado = 'cerrado') as cerrados, "
        "exists (select 1 from app_users u where u.agente_id = a.id and u.rol = 'lider') as es_lider, "
        "nullif(trim(coalesce(s.nombre,'') || ' ' || coalesce(s.apellido,'')), '') as superior, "
        # asistencia a capacitaciones
        "(select count(*)::int from capacitacion_asistencia ca "
        " join capacitaciones k on k.id = ca.capacitacion_id "
        " where ca.agente_id = a.id and k.tenant_id = a.tenant_id) as sesiones_registradas, "
        "(select count(*)::int from capacitacion_asistencia ca "
        " join capacitaciones k on k.id = ca.capacitacion_id "
        " where ca.agente_id = a.id and k.tenant_id = a.tenant_id and ca.asistio = true) as sesiones_asistidas, "
        "(select k.fecha from capacitacion_asistencia ca "
        " join capacitaciones k on k.id = ca.capacitacion_id "
        " where ca.agente_id = a.id and k.tenant_id = a.tenant_id and ca.asistio = true "
        " order by k.fecha desc limit 1) as ultima_sesion_fecha, "
        "(select count(*)::int from capacitacion_asistencia ca "
        " join capacitaciones k on k.id = ca.capacitacion_id "
        " where ca.agente_id = a.id and k.tenant_id = a.tenant_id and ca.asistio = false) as sesiones_faltadas, "
        # progreso onboarding
        "(select round(coalesce(avg(case when ep.estado='completado' then 100 else 0 end),0))::int "
        " from etapa_progreso ep where ep.agente_id = a.id) as pct_onboarding, "
        "(select ce.nombre from etapa_progreso ep "
        " join capacitacion_etapas ce on ce.id = ep.etapa_id "
        " where ep.agente_id = a.id and ep.estado = 'en_curso' limit 1) as etapa_actual, "
        # simulador
        "(select count(*)::int from simulaciones sim "
        " where sim.agente_id = a.id and sim.tenant_id = a.tenant_id) as total_simulaciones, "
        "(select round(avg(sim.puntaje))::int from simulaciones sim "
        " where sim.agente_id = a.id and sim.tenant_id = a.tenant_id) as puntaje_simulador, "
        "(select sim.escenario from simulaciones sim "
        " where sim.agente_id = a.id and sim.tenant_id = a.tenant_id "
        " group by sim.escenario order by count(*) desc limit 1) as escenario_favorito, "
        # cuenta de acceso del agente
        "exists (select 1 from app_users u where u.agente_id = a.id and u.rol = 'agente') as tiene_usuario, "
        "coalesce((select u.activo from app_users u where u.agente_id = a.id and u.rol = 'agente' limit 1), false) as usuario_activo "
        "from agentes a left join agentes s on s.id = a.superior_id "
        f"where a.tenant_id = %s and a.estado <> 'baja'{sc} "
        "order by a.nombre, a.apellido",
        (tenant, *sp),
    )


class AgenteBody(BaseModel):
    nombre: str
    apellido: str | None = None
    celular: str | None = None
    email: str | None = None
    ciudad: str | None = None
    region: str | None = None
    superior_id: str | None = None
    estado: str = "activo"
    lat: float | None = None
    lng: float | None = None


@router.post("/gestion/agentes")
def create_agente(body: AgenteBody, ctx: dict = Depends(view_ctx)) -> dict:
    if not body.nombre.strip():
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    tenant, scope_root = ctx["tenant_id"], ctx["scope_root"]
    superior = body.superior_id or None
    if scope_root:  # líder: el nuevo agente debe quedar dentro de su equipo
        scope = scoped_agente_ids(tenant, scope_root) or []
        if not superior or str(superior) not in scope:
            superior = scope_root            # cuelga del propio líder
    row = _exec(
        "insert into agentes (tenant_id, nombre, apellido, celular, email, ciudad, region, "
        "superior_id, estado, lat, lng, origen_alta) "
        "values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'manual') returning id",
        (tenant, body.nombre.strip(), body.apellido, body.celular, body.email, body.ciudad,
         body.region, superior, body.estado, body.lat, body.lng),
    )
    return {"id": str(row[0])}


@router.patch("/gestion/agentes/{aid}")
def update_agente(aid: str, body: AgenteBody, ctx: dict = Depends(view_ctx)) -> dict:
    if body.estado not in ESTADOS_AGENTE:
        raise HTTPException(status_code=400, detail="Estado inválido")
    tenant, scope_root = ctx["tenant_id"], ctx["scope_root"]
    assert_agente_in_scope(tenant, scope_root, aid)                 # el agente es de su equipo
    assert_agente_in_scope(tenant, scope_root, body.superior_id)    # no lo mueve fuera del equipo
    _exec(
        "update agentes set nombre=%s, apellido=%s, celular=%s, email=%s, ciudad=%s, region=%s, "
        "superior_id=%s, estado=%s, lat=%s, lng=%s where id=%s and tenant_id=%s",
        (body.nombre.strip(), body.apellido, body.celular, body.email, body.ciudad, body.region,
         body.superior_id or None, body.estado, body.lat, body.lng, aid, tenant),
    )
    return {"ok": True}


@router.post("/gestion/agentes/{aid}/lider")
def designar_lider(aid: str, tenant: str = Depends(require_owner)) -> dict:
    """Owner designa a un agente como LÍDER: crea su usuario del panel acotado a su
    equipo (su sub-árbol). Entra al panel con su email vía enlace de acceso (magic link)."""
    ag = _rows("select email, nombre, apellido from agentes where id = %s and tenant_id = %s and estado <> 'baja'", (aid, tenant))
    if not ag:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    email = (ag[0]["email"] or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="El agente necesita un email para ser líder")
    nombre = f"{ag[0]['nombre']} {ag[0].get('apellido') or ''}".strip() + " (líder)"
    _exec(
        "insert into app_users (tenant_id, email, password_hash, nombre, rol, agente_id) "
        "values (%s, %s, %s, %s, 'lider', %s) "
        "on conflict (email) do update set rol='lider', agente_id=excluded.agente_id, activo=true",
        (tenant, email, hash_password(secrets.token_urlsafe(16)), nombre, aid),
    )
    return {"ok": True, "email": email}


@router.delete("/gestion/agentes/{aid}/lider")
def quitar_lider(aid: str, tenant: str = Depends(require_owner)) -> dict:
    """Owner quita el rol de líder a un agente (borra su usuario del panel)."""
    _exec("delete from app_users where tenant_id = %s and agente_id = %s and rol = 'lider'", (tenant, aid))
    return {"ok": True}


@router.post("/gestion/agentes/{aid}/usuario")
def activar_usuario_agente(aid: str, tenant: str = Depends(require_owner)) -> dict:
    """Crea cuenta de acceso para un agente y le envía el magic link por email."""
    from app.core import auth as authcore
    from app.services import email as email_svc
    from app.core.config import settings
    ag = _rows(
        "select nombre, apellido, email from agentes where id = %s and tenant_id = %s and estado <> 'baja'",
        (aid, tenant),
    )
    if not ag:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    email = (ag[0]["email"] or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="El agente necesita un email para activar su cuenta")
    nombre = f"{ag[0]['nombre']} {ag[0].get('apellido') or ''}".strip()
    _exec(
        "insert into app_users (tenant_id, email, nombre, rol, agente_id, activo, must_set_password) "
        "values (%s, %s, %s, 'agente', %s, true, true) "
        "on conflict (email) do update set rol='agente', agente_id=excluded.agente_id, "
        "activo=true, must_set_password=true",
        (tenant, email, nombre, aid),
    )
    user = authcore.get_user_by_email(email)
    resp: dict = {"ok": True, "email": email}
    if user:
        token = authcore.make_magic_token(user)
        link = f"{settings.frontend_url}/magic?token={token}"
        email_svc.send_magic_link(email, link)
        if settings.environment == "development":
            resp["link"] = link
    return resp


@router.patch("/gestion/agentes/{aid}/usuario")
def toggle_usuario_agente(aid: str, body: dict, tenant: str = Depends(require_owner)) -> dict:
    """Activa o desactiva la cuenta de acceso de un agente."""
    activo = bool(body.get("activo", True))
    _exec(
        "update app_users set activo = %s where tenant_id = %s and agente_id = %s and rol = 'agente'",
        (activo, tenant, aid),
    )
    return {"ok": True, "activo": activo}


@router.get("/gestion/agentes/{aid}/usuario")
def get_usuario_agente(aid: str, tenant: str = Depends(require_owner)) -> dict:
    """Estado de la cuenta de acceso de un agente."""
    rows = _rows(
        "select activo, must_set_password, email from app_users where tenant_id = %s and agente_id = %s and rol = 'agente'",
        (tenant, aid),
    )
    if not rows:
        return {"existe": False}
    return {"existe": True, "activo": rows[0]["activo"], "must_set_password": rows[0]["must_set_password"], "email": rows[0]["email"]}


@router.post("/gestion/agentes/{aid}/baja")
def baja_agente(aid: str, ctx: dict = Depends(view_ctx)) -> dict:
    """Baja lógica: estado='baja' + fecha_baja (no se borra, conserva historial)."""
    tenant = ctx["tenant_id"]
    assert_agente_in_scope(tenant, ctx["scope_root"], aid)
    _exec(
        "update agentes set estado='baja', fecha_baja=current_date where id=%s and tenant_id=%s",
        (aid, tenant),
    )
    return {"ok": True}


# ── Pendientes / acciones ─────────────────────────────────────────────────────
@router.get("/gestion/pendientes")
def list_pendientes(ctx: dict = Depends(view_ctx), lang: str = "es") -> dict:
    en = lang == "en"
    tenant = ctx["tenant_id"]
    scope = scoped_agente_ids(tenant, ctx["scope_root"])
    scp, spp = _scope("agente_id", scope)
    prog = _rows(
        "select count(*) filter (where estado = 'cerrado') as cerrados, "
        "count(*) filter (where estado <> 'cerrado') as abiertos, "
        "count(*) filter (where estado <> 'cerrado' and prioridad = 'critico') as criticos, "
        "count(*) filter (where estado <> 'cerrado' and agente_id is null) as sin_asignar, "
        f"count(*) as total from pendientes where tenant_id = %s{scp}",
        (tenant, *spp),
    )[0]
    total = prog["total"] or 1
    prog["pct"] = round(prog["cerrados"] / total * 100)
    titulo_expr = "coalesce(p.titulo_en, p.titulo)" if en else "p.titulo"
    cliente_expr = "coalesce(p.cliente_en, p.cliente)" if en else "p.cliente"
    sci, spi = _scope("p.agente_id", scope)
    items = _rows(
        f"select p.id, {titulo_expr} as titulo, {cliente_expr} as cliente, p.vip, "
        "p.tipo, p.prioridad, p.estado, p.created_at, p.fecha_cierre, p.agente_id, "
        "round(extract(epoch from now()-p.created_at)/3600)::int as horas, "
        "nullif(trim(coalesce(a.nombre,'') || ' ' || coalesce(a.apellido,'')), '') as agente "
        "from pendientes p left join agentes a on a.id = p.agente_id "
        f"where p.tenant_id = %s and p.estado <> 'cerrado'{sci} "
        "order by case p.prioridad when 'critico' then 0 when 'alto' then 1 "
        "when 'medio' then 2 else 3 end, p.created_at",
        (tenant, *spi),
    )
    return {"progreso": prog, "items": items}


class PendienteCreate(BaseModel):
    titulo: str
    tipo: str = "seguimiento"
    prioridad: str = "medio"
    agente_id: str | None = None


@router.post("/gestion/pendientes")
def create_pendiente(body: PendienteCreate, ctx: dict = Depends(view_ctx)) -> dict:
    if not body.titulo.strip():
        raise HTTPException(status_code=400, detail="El título es obligatorio")
    if body.tipo not in TIPOS or body.prioridad not in PRIORIDADES:
        raise HTTPException(status_code=400, detail="Tipo o prioridad inválidos")
    tenant = ctx["tenant_id"]
    assert_agente_in_scope(tenant, ctx["scope_root"], body.agente_id)   # asigna dentro de su equipo
    row = _exec(
        "insert into pendientes (tenant_id, agente_id, titulo, tipo, prioridad, estado, creado_por) "
        "values (%s, %s, %s, %s, %s, 'pendiente', 'human') returning id",
        (tenant, body.agente_id or None, body.titulo.strip(), body.tipo, body.prioridad),
    )
    return {"id": str(row[0])}


class PendienteUpdate(BaseModel):
    estado: str | None = None
    agente_id: str | None = None       # reasignar
    prioridad: str | None = None       # escalar
    clear_agente: bool = False         # desasignar explícito


@router.patch("/gestion/pendientes/{pid}")
def update_pendiente(pid: str, body: PendienteUpdate, ctx: dict = Depends(view_ctx)) -> dict:
    tenant, scope_root = ctx["tenant_id"], ctx["scope_root"]
    if scope_root:
        # el pendiente debe ser de su equipo, y si reasigna, al nuevo también
        own = _rows("select agente_id from pendientes where id=%s and tenant_id=%s", (pid, tenant))
        if not own:
            raise HTTPException(status_code=404, detail="Pendiente no encontrado")
        assert_agente_in_scope(tenant, scope_root, own[0]["agente_id"])
        assert_agente_in_scope(tenant, scope_root, body.agente_id)
    sets, params = [], []
    if body.estado is not None:
        if body.estado not in ESTADOS:
            raise HTTPException(status_code=400, detail="Estado inválido")
        sets.append("estado = %s")
        params.append(body.estado)
        sets.append("fecha_cierre = case when %s = 'cerrado' then now() else null end")
        params.append(body.estado)
    if body.prioridad is not None:
        if body.prioridad not in PRIORIDADES:
            raise HTTPException(status_code=400, detail="Prioridad inválida")
        sets.append("prioridad = %s")
        params.append(body.prioridad)
    if body.agente_id is not None or body.clear_agente:
        sets.append("agente_id = %s")
        params.append(None if body.clear_agente else body.agente_id)
    if not sets:
        return {"ok": True}
    params += [pid, tenant]
    _exec(f"update pendientes set {', '.join(sets)} where id = %s and tenant_id = %s", tuple(params))
    return {"ok": True}


@router.delete("/gestion/pendientes/{pid}")
def delete_pendiente(pid: str, tenant: str = Depends(require_tenant)) -> dict:
    _exec("delete from pendientes where id = %s and tenant_id = %s", (pid, tenant))
    return {"ok": True}


# ── Grupos (actividad de chats; provienen de la captura, solo lectura) ─────────
@router.get("/gestion/grupos")
def list_grupos(tenant: str = Depends(require_tenant), lang: str = "es") -> list:
    name_expr = "coalesce(c.name_en, c.name)" if lang == "en" else "c.name"
    return _rows(
        f"select c.id, {name_expr} as nombre, c.type as tipo, "
        "(select count(*) from messages m where m.chat_id = c.id and m.tenant_id = %s "
        " and m.wa_timestamp >= now() - interval '7 days') as mensajes_7d, "
        "(select count(*) from messages m where m.chat_id = c.id and m.tenant_id = %s) as mensajes_total, "
        "(select max(m.wa_timestamp) from messages m where m.chat_id = c.id and m.tenant_id = %s) as ultimo "
        "from chats c where c.tenant_id = %s order by mensajes_7d desc",
        (tenant, tenant, tenant, tenant),
    )


# ── Eventos comerciales (lista + cambiar estado) ──────────────────────────────
EVENTO_STATUS = ("open", "in_progress", "done", "dismissed")


@router.get("/gestion/eventos")
def list_eventos(tenant: str = Depends(require_tenant), lang: str = "es") -> list:
    en = lang == "en"
    titulo = "coalesce(title_en, title)" if en else "title"
    detalle = "coalesce(description_en, description)" if en else "description"
    return _rows(
        f"select id, type as tipo, status, {titulo} as titulo, {detalle} as detalle, "
        "importance as nivel, round(coalesce(confidence,0)*100)::int as probabilidad, "
        "coalesce(valor,0)::int as potencial, created_at from commercial_events "
        "where tenant_id = %s order by created_at desc",
        (tenant,),
    )


class EventoUpdate(BaseModel):
    status: str


@router.patch("/gestion/eventos/{eid}")
def update_evento(eid: str, body: EventoUpdate, tenant: str = Depends(require_tenant)) -> dict:
    if body.status not in EVENTO_STATUS:
        raise HTTPException(status_code=400, detail="Estado inválido")
    _exec("update commercial_events set status = %s where id = %s and tenant_id = %s", (body.status, eid, tenant))
    return {"ok": True}


# ── Mensajes capturados (feed) ────────────────────────────────────────────────
@router.get("/gestion/mensajes")
def list_mensajes(tenant: str = Depends(require_tenant), lang: str = "es", tipo: str = "all", q: str = "") -> list:
    chat = "coalesce(c.name_en, c.name)" if lang == "en" else "c.name"
    where = ["m.tenant_id = %s"]
    params: list = [tenant]
    if tipo == "text":
        where.append("m.type = 'text'")
    elif tipo == "audio":
        where.append("m.type = 'audio'")
    elif tipo == "image":
        where.append("m.type = 'image'")
    if q.strip():
        where.append("(m.body ilike %s or tr.text ilike %s)")
        params += [f"%{q.strip()}%", f"%{q.strip()}%"]
    return _rows(
        f"select m.id, m.type as tipo, coalesce(m.body, tr.text) as texto, m.wa_timestamp as ts, "
        f"{chat} as chat, ct.display_name as remitente, (tr.message_id is not null) as transcripto "
        "from messages m join chats c on c.id = m.chat_id "
        "left join contacts ct on ct.id = m.sender_id "
        "left join transcriptions tr on tr.message_id = m.id "
        f"where {' and '.join(where)} order by m.wa_timestamp desc limit 80",
        tuple(params),
    )


@router.get("/gestion/mensajes-stats")
def mensajes_stats(tenant: str = Depends(require_tenant)) -> dict:
    """Stats rápidos de conversaciones: mensajes nuevos (no atendidos) y grupos activos (últimos 7 días)."""
    rows = _rows(
        "select "
        "  (select count(*)::int from messages m "
        "   left join message_triage mt on mt.message_id = m.id "
        "   where m.tenant_id = %s and coalesce(mt.status, 'new') = 'new') as nuevas, "
        "  (select count(distinct m.chat_id)::int from messages m "
        "   where m.tenant_id = %s "
        "   and m.wa_timestamp >= now() - interval '7 days') as grupos_activos",
        (tenant, tenant),
    )
    r = rows[0] if rows else {}
    return {"nuevas": r.get("nuevas") or 0, "grupos_activos": r.get("grupos_activos") or 0}


# ── Capacitaciones (lista con asistencia) ─────────────────────────────────────
@router.get("/gestion/capacitacion/programa")
def capacitacion_programa(ctx: dict = Depends(view_ctx), lang: str = "es") -> dict:
    """Ruta de capacitación: progreso global, etapas (funnel), progreso por agente,
    calendario de sesiones, alertas y notificaciones. Acotado al equipo del líder."""
    en = lang == "en"
    tenant = ctx["tenant_id"]
    scope = scoped_agente_ids(tenant, ctx["scope_root"])
    scP, spP = _scope("agente_id", scope)
    scPP, spPP = _scope("p.agente_id", scope)
    scA, spA = _scope("a.id", scope)
    nombre_e = "coalesce(e.nombre_en, e.nombre)" if en else "e.nombre"

    etapas = _rows(
        f"select e.id, {nombre_e} as nombre, e.descripcion, e.orden, "
        f"(select count(*) from etapa_progreso p where p.etapa_id=e.id and p.estado='completado'{scPP}) as completados, "
        f"(select count(*) from etapa_progreso p where p.etapa_id=e.id and p.estado='en_curso'{scPP}) as en_curso, "
        f"(select count(*) from etapa_progreso p where p.etapa_id=e.id and p.estado='pendiente'{scPP}) as pendientes "
        "from capacitacion_etapas e where e.tenant_id=%s order by e.orden",
        (*spPP, *spPP, *spPP, tenant),
    )
    total_etapas = len(etapas) or 1
    n_ag = _rows(f"select count(distinct agente_id) as n from etapa_progreso where tenant_id=%s{scP}", (tenant, *spP))[0]["n"] or 1
    comp = _rows(f"select count(*) as n from etapa_progreso where tenant_id=%s and estado='completado'{scP}", (tenant, *spP))[0]["n"]
    total = total_etapas * n_ag
    for e in etapas:
        e["pct"] = round(e["completados"] / n_ag * 100) if n_ag else 0

    agentes = _rows(
        f"select trim(a.nombre || ' ' || coalesce(a.apellido,'')) as nombre, "
        "(select count(*) from etapa_progreso p where p.agente_id=a.id and p.estado='completado') as completados, "
        f"(select {nombre_e} from etapa_progreso p join capacitacion_etapas e on e.id=p.etapa_id "
        " where p.agente_id=a.id and p.estado='en_curso' order by e.orden limit 1) as etapa_actual "
        f"from agentes a where a.tenant_id=%s and a.estado<>'baja'{scA} "
        "and exists (select 1 from etapa_progreso p where p.agente_id=a.id) "
        "order by completados desc", (tenant, *spA),
    )
    for a in agentes:
        a["pct"] = round(a["completados"] / total_etapas * 100) if total_etapas else 0

    cap_n = "coalesce(k.nombre_en, k.nombre)" if en else "k.nombre"
    calendario = _rows(
        f"select k.id, {cap_n} as nombre, k.estado, k.fecha, "
        "(select count(*) from capacitacion_asistencia x where x.capacitacion_id=k.id and x.asistio) as asistentes "
        "from capacitaciones k where k.tenant_id=%s and k.fecha is not null order by k.fecha", (tenant,),
    )
    alertas = [
        {"titulo": k["nombre"], "tono": "warning",
         "detalle": "No attendees confirmed" if en else "Sin asistentes confirmados"}
        for k in calendario if k["estado"] in ("programada", "en_curso") and k["asistentes"] == 0
    ]
    notificaciones = _rows(
        f"select trim(a.nombre || ' ' || coalesce(a.apellido,'')) as agente, {nombre_e} as etapa, p.completado_at as ts "
        "from etapa_progreso p join agentes a on a.id=p.agente_id join capacitacion_etapas e on e.id=p.etapa_id "
        f"where p.tenant_id=%s and p.estado='completado' and p.completado_at is not null{scPP} "
        "order by p.completado_at desc limit 6", (tenant, *spPP),
    )

    return {
        "programa": {"nombre": "Commercial Onboarding Path" if en else "Ruta de Onboarding Comercial", "total_etapas": len(etapas)},
        "progreso": {"completados": comp, "total": total, "pct": round(comp / total * 100) if total else 0},
        "etapas": etapas, "agentes": agentes, "calendario": calendario,
        "alertas": alertas, "notificaciones": notificaciones,
    }


class SyncAsistenciaBody(BaseModel):
    # Modo andamiaje (sin credenciales Zoom): lista simulada de participantes.
    simular: list[dict] | None = None  # [{"email": "...", "minutos": 45}, ...]


class PatchCapacitacionBody(BaseModel):
    zoom_meeting_id: str | None = None


@router.patch("/gestion/capacitaciones/{cid}")
def patch_capacitacion(cid: str, body: PatchCapacitacionBody, tenant: str = Depends(require_tenant)) -> dict:
    """Actualiza campos editables de una capacitación (hoy: zoom_meeting_id)."""
    cap = _rows("select id from capacitaciones where id = %s and tenant_id = %s", (cid, tenant))
    if not cap:
        raise HTTPException(status_code=404, detail="Capacitación no encontrada")
    _exec(
        "update capacitaciones set zoom_meeting_id = %s where id = %s and tenant_id = %s",
        (body.zoom_meeting_id, cid, tenant),
    )
    return {"ok": True}


@router.post("/gestion/capacitaciones/{cid}/sync-asistencia")
def sync_asistencia(cid: str, body: SyncAsistenciaBody | None = None, tenant: str = Depends(require_tenant)) -> dict:
    """Concilia la asistencia de una capacitación desde Zoom (o simulada si no hay
    credenciales). Marca asistencia por agente (match por email)."""
    cap = _rows("select id, zoom_meeting_id from capacitaciones where id = %s and tenant_id = %s", (cid, tenant))
    if not cap:
        raise HTTPException(status_code=404, detail="Capacitación no encontrada")

    participantes = zoom.fetch_participants(cap[0]["zoom_meeting_id"]) if zoom.enabled() else None
    source = "zoom"
    if participantes is None:
        participantes = (body.simular if body else None) or []
        source = "simulado"
    marcados = zoom.reconcile(cid, tenant, participantes, settings.zoom_min_minutos)
    return {"ok": True, "source": source, "participantes": len(participantes), "marcados": marcados}


@router.get("/gestion/capacitaciones/{cid}/asistencia")
def get_asistencia(cid: str, tenant: str = Depends(require_tenant)) -> dict:
    """Lista de todos los agentes activos con su asistencia (asistio true/false) para una sesión."""
    cap = _rows(
        "select k.id, k.nombre, k.fecha, k.estado, k.zoom_meeting_id from capacitaciones k "
        "where k.id = %s and k.tenant_id = %s",
        (cid, tenant),
    )
    if not cap:
        raise HTTPException(status_code=404, detail="Capacitación no encontrada")
    agentes = _rows(
        "select a.id, a.nombre, a.apellido, a.email, a.celular, "
        "coalesce(ca.asistio, false) as asistio "
        "from agentes a "
        "left join capacitacion_asistencia ca on ca.agente_id = a.id and ca.capacitacion_id = %s "
        "where a.tenant_id = %s and a.estado != 'baja' "
        "order by ca.asistio asc nulls first, a.nombre asc",
        (cid, tenant),
    )
    return {"capacitacion": cap[0], "agentes": agentes}


@router.get("/gestion/capacitaciones")
def list_capacitaciones(tenant: str = Depends(require_tenant), lang: str = "es") -> list:
    nombre = "coalesce(k.nombre_en, k.nombre)" if lang == "en" else "k.nombre"
    return _rows(
        f"select k.id, {nombre} as nombre, k.estado, k.fecha, "
        "nullif(trim(coalesce(a.nombre,'') || ' ' || coalesce(a.apellido,'')), '') as instructor, "
        "(select count(*) from capacitacion_asistencia x where x.capacitacion_id = k.id and x.asistio) as asistentes "
        "from capacitaciones k left join agentes a on a.id = k.instructor_id "
        "where k.tenant_id = %s order by k.fecha desc nulls last",
        (tenant,),
    )


# ── Cartera de clientes (preocupación #3) ─────────────────────────────────────
PRODUCTOS = ("vida", "retiro", "auto", "salud", "hogar")
ESTADOS_CLIENTE = ("activo", "prospecto", "inactivo")


@router.get("/gestion/clientes")
def list_clientes(ctx: dict = Depends(view_ctx)) -> dict:
    """Cartera con flags: renovación próxima, sin seguimiento, cross-sell. Acotada
    al equipo del líder."""
    tenant = ctx["tenant_id"]
    scope = scoped_agente_ids(tenant, ctx["scope_root"])
    sc, sp = _scope("c.agente_id", scope)
    scS, spS = _scope("agente_id", scope)
    summary = _rows(
        "select count(*) as total, "
        "count(*) filter (where vencimiento is not null and vencimiento - current_date between 0 and 30) as por_renovar, "
        "count(*) filter (where ultimo_contacto is null or current_date - ultimo_contacto > 30) as sin_seguimiento, "
        f"coalesce(sum(valor_poliza),0)::int as valor_cartera from clientes where tenant_id=%s{scS}",
        (tenant, *spS),
    )[0]
    items = _rows(
        "select c.id, c.nombre, c.telefono, c.email, c.producto, c.estado, "
        "coalesce(c.valor_poliza,0)::int as valor, c.vencimiento, c.ultimo_contacto, c.vip, "
        "case when c.vencimiento is not null then (c.vencimiento - current_date) else null end as renovacion_dias, "
        "case when c.ultimo_contacto is not null then (current_date - c.ultimo_contacto) else null end as sin_contacto_dias, "
        "(c.producto = 'vida') as cross_sell, c.agente_id, "
        "nullif(trim(coalesce(a.nombre,'')||' '||coalesce(a.apellido,'')), '') as agente "
        "from clientes c left join agentes a on a.id=c.agente_id "
        f"where c.tenant_id=%s{sc} order by c.vencimiento nulls last",
        (tenant, *sp),
    )
    return {"summary": summary, "items": items}


class ClienteBody(BaseModel):
    nombre: str
    telefono: str | None = None
    email: str | None = None
    agente_id: str | None = None
    producto: str | None = None
    estado: str = "activo"
    valor_poliza: float | None = 0
    vencimiento: str | None = None   # YYYY-MM-DD
    vip: bool = False


@router.post("/gestion/clientes")
def create_cliente(body: ClienteBody, ctx: dict = Depends(view_ctx)) -> dict:
    if not body.nombre.strip():
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    tenant, scope_root = ctx["tenant_id"], ctx["scope_root"]
    agente = body.agente_id or None
    if scope_root:
        scope = scoped_agente_ids(tenant, scope_root) or []
        if not agente or str(agente) not in scope:
            agente = scope_root
    row = _exec(
        "insert into clientes (tenant_id, nombre, telefono, email, agente_id, producto, estado, valor_poliza, vencimiento, vip) "
        "values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) returning id",
        (tenant, body.nombre.strip(), body.telefono, body.email, agente, body.producto, body.estado,
         body.valor_poliza or 0, body.vencimiento or None, body.vip),
    )
    return {"id": str(row[0])}


@router.patch("/gestion/clientes/{cid}")
def update_cliente(cid: str, body: ClienteBody, ctx: dict = Depends(view_ctx)) -> dict:
    tenant, scope_root = ctx["tenant_id"], ctx["scope_root"]
    if scope_root:
        own = _rows("select agente_id from clientes where id=%s and tenant_id=%s", (cid, tenant))
        if not own:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        assert_agente_in_scope(tenant, scope_root, own[0]["agente_id"])
        assert_agente_in_scope(tenant, scope_root, body.agente_id)
    _exec(
        "update clientes set nombre=%s, telefono=%s, email=%s, agente_id=%s, producto=%s, estado=%s, "
        "valor_poliza=%s, vencimiento=%s, vip=%s where id=%s and tenant_id=%s",
        (body.nombre.strip(), body.telefono, body.email, body.agente_id or None, body.producto, body.estado,
         body.valor_poliza or 0, body.vencimiento or None, body.vip, cid, tenant),
    )
    return {"ok": True}


@router.post("/gestion/clientes/{cid}/contacto")
def registrar_contacto(cid: str, ctx: dict = Depends(view_ctx)) -> dict:
    """Registra que hoy se contactó al cliente (resetea 'sin seguimiento')."""
    tenant, scope_root = ctx["tenant_id"], ctx["scope_root"]
    if scope_root:
        own = _rows("select agente_id from clientes where id=%s and tenant_id=%s", (cid, tenant))
        if own:
            assert_agente_in_scope(tenant, scope_root, own[0]["agente_id"])
    _exec("update clientes set ultimo_contacto=current_date where id=%s and tenant_id=%s", (cid, tenant))
    return {"ok": True}


# ── Onboarding del líder — primeros pasos tras ser designado ──────────────────

_PASOS_ES = [
    {"id": "bienvenida", "titulo": "Bienvenido al panel", "detalle": "Ya ingresaste a tu panel de líder.", "href": None},
    {"id": "equipo", "titulo": "Conocé tu equipo", "detalle": "Mirá quiénes son tus agentes, su estado y ubicación.", "href": "/agentes"},
    {"id": "pendientes", "titulo": "Revisá tus pendientes", "detalle": "Hay clientes esperando atención de tu equipo.", "href": "/pendientes"},
    {"id": "acciones", "titulo": "Mirá las acciones sugeridas", "detalle": "La IA ya redactó mensajes para que apruebes.", "href": "/acciones"},
    {"id": "briefing", "titulo": "Configurá tu briefing diario", "detalle": "Recibí un resumen del equipo por WhatsApp cada día.", "href": "/ajustes"},
]
_PASOS_EN = [
    {"id": "bienvenida", "titulo": "Welcome to the panel", "detalle": "You're now in your leader dashboard.", "href": None},
    {"id": "equipo", "titulo": "Meet your team", "detalle": "See who your agents are, their status and location.", "href": "/agentes"},
    {"id": "pendientes", "titulo": "Review pending items", "detalle": "There are clients waiting for your team's attention.", "href": "/pendientes"},
    {"id": "acciones", "titulo": "Check suggested actions", "detalle": "The AI already drafted messages for you to approve.", "href": "/acciones"},
    {"id": "briefing", "titulo": "Set up your daily briefing", "detalle": "Get a daily team summary via WhatsApp.", "href": "/ajustes"},
]


@router.get("/gestion/lider/onboarding")
def lider_onboarding_get(user: dict = Depends(current_user), lang: str = "es") -> dict:
    """Estado del onboarding para líderes: si ya fue completado y los pasos guiados."""
    user_id = user.get("sub")
    rows = _rows("select lider_onboarding_completado from app_users where id=%s", (user_id,))
    completado = bool(rows[0]["lider_onboarding_completado"]) if rows else False
    pasos = _PASOS_EN if lang == "en" else _PASOS_ES
    return {"completado": completado, "pasos": pasos}


@router.post("/gestion/lider/onboarding/completar")
def lider_onboarding_completar(user: dict = Depends(current_user)) -> dict:
    """Marca el onboarding del líder como completado (llamar al hacer clic en 'Comenzar')."""
    user_id = user.get("sub")
    _exec(
        "update app_users set lider_onboarding_completado=true, lider_onboarding_visto_at=now() where id=%s",
        (user_id,),
    )
    return {"ok": True}


# ── Simulador ─────────────────────────────────────────────────────────────────

@router.get("/gestion/simulador")
def get_simulador_stats(lang: str = "es", ctx: dict = Depends(view_ctx)) -> dict:
    tid = ctx["tenant_id"]
    nombre_col = "nombre_es" if lang != "en" else "nombre_en"

    # Totales globales + total de agentes activos
    totals = _rows(
        "select "
        "(select count(*)::int from agentes where tenant_id=%s and estado<>'baja') as total_agentes, "
        "(select count(distinct agente_id)::int from simulaciones where tenant_id=%s) as agentes_usaron, "
        "(select count(*)::int from simulaciones where tenant_id=%s) as total_simulaciones, "
        "(select round(avg(puntaje))::int from simulaciones where tenant_id=%s) as puntaje_promedio",
        (tid, tid, tid, tid),
    )
    t = totals[0] if totals else {}
    total_ag = t.get("total_agentes") or 0
    usaron = t.get("agentes_usaron") or 0

    # Escenarios con stats + % adopción
    escenarios = _rows(
        f"select e.clave, e.{nombre_col} as nombre, e.activo, "
        "count(s.id)::int as total_usos, "
        "round(avg(s.puntaje))::int as puntaje_promedio, "
        "count(distinct s.agente_id)::int as agentes_usaron "
        "from escenarios_simulador e "
        "left join simulaciones s on s.escenario = e.clave and s.tenant_id = %s "
        "where e.tenant_id = %s "
        "group by e.id, e.clave, e.activo "
        "order by e.activo desc, puntaje_promedio asc nulls last",
        (tid, tid),
    )

    # Por agente por escenario: usos, puntaje promedio, último puntaje
    detalle = _rows(
        "select s.escenario, a.id as agente_id, "
        "trim(a.nombre || ' ' || coalesce(a.apellido, '')) as nombre, "
        "count(s.id)::int as usos, "
        "round(avg(s.puntaje))::int as puntaje_promedio, "
        "(select s2.puntaje from simulaciones s2 "
        " where s2.agente_id = a.id and s2.escenario = s.escenario and s2.tenant_id = %s "
        " order by s2.created_at desc limit 1) as ultimo_puntaje "
        "from simulaciones s "
        "join agentes a on a.id = s.agente_id "
        "where s.tenant_id = %s "
        "group by s.escenario, a.id, a.nombre, a.apellido "
        "order by s.escenario, puntaje_promedio desc nulls last",
        (tid, tid),
    )

    # Agentes que NUNCA usaron cada escenario
    todos_agentes = _rows(
        "select id, trim(nombre || ' ' || coalesce(apellido,'')) as nombre "
        "from agentes where tenant_id=%s and estado<>'baja' order by nombre",
        (tid,),
    )

    # Agrupar detalle por escenario
    detalle_by_escenario: dict = {}
    for row in detalle:
        clave = row["escenario"]
        if clave not in detalle_by_escenario:
            detalle_by_escenario[clave] = []
        detalle_by_escenario[clave].append(row)

    # Armar respuesta de escenarios
    agentes_ids_usaron_by_escenario: dict = {
        e["clave"]: {r["agente_id"] for r in detalle_by_escenario.get(e["clave"], [])}
        for e in escenarios
    }
    escenarios_out = []
    for e in escenarios:
        clave = e["clave"]
        ag_usaron = agentes_ids_usaron_by_escenario.get(clave, set())
        sin_practica = [a for a in todos_agentes if a["id"] not in ag_usaron]
        pct_adopcion = round(len(ag_usaron) / total_ag * 100) if total_ag else 0
        escenarios_out.append({
            **e,
            "pct_adopcion": pct_adopcion,
            "agentes": detalle_by_escenario.get(clave, []),
            "sin_practica": sin_practica,
        })

    return {
        "tasa_uso": round(usaron / total_ag * 100) if total_ag else 0,
        "agentes_usaron": usaron,
        "total_agentes": total_ag,
        "total_simulaciones": t.get("total_simulaciones") or 0,
        "puntaje_promedio": t.get("puntaje_promedio"),
        "escenarios": escenarios_out,
    }


@router.get("/gestion/memoria/alertas")
def get_memoria_alertas(ctx: dict = Depends(view_ctx)) -> dict:
    tid = ctx["tenant_id"]

    # Pendientes vencidos (fecha límite pasada, sin cerrar)
    vencidos = _rows(
        "select p.id, p.titulo, p.prioridad, p.tipo, p.fecha_cierre, "
        "trim(coalesce(a.nombre,'') || ' ' || coalesce(a.apellido,'')) as agente "
        "from pendientes p "
        "left join agentes a on a.id = p.agente_id "
        "where p.tenant_id=%s and p.estado<>'cerrado' "
        "and p.fecha_cierre is not null and p.fecha_cierre < now() "
        "order by p.fecha_cierre asc limit 10",
        (tid,),
    )

    # Agentes activos sin ninguna asistencia registrada, con más de 7 días en el sistema
    sin_actividad = _rows(
        "select a.id, a.nombre, a.apellido, a.celular, a.created_at "
        "from agentes a "
        "where a.tenant_id=%s and a.estado='activo' "
        "and a.created_at < now() - interval '7 days' "
        "and not exists ("
        "  select 1 from capacitacion_asistencia ca "
        "  join capacitaciones k on k.id = ca.capacitacion_id "
        "  where ca.agente_id = a.id and k.tenant_id = a.tenant_id and ca.asistio = true"
        ") "
        "order by a.created_at asc limit 8",
        (tid,),
    )

    # Agentes sin ninguna simulación y más de 14 días en el sistema
    sin_simulacion = _rows(
        "select a.id, a.nombre, a.apellido "
        "from agentes a "
        "where a.tenant_id=%s and a.estado='activo' "
        "and a.created_at < now() - interval '14 days' "
        "and not exists (select 1 from simulaciones s where s.agente_id = a.id and s.tenant_id = a.tenant_id) "
        "order by a.nombre limit 8",
        (tid,),
    )

    # Notificaciones internas sin leer con más de 48h
    notif = _rows(
        "select count(*)::int as total from mensajes_internos "
        "where tenant_id=%s and leido=false and created_at < now() - interval '48 hours'",
        (tid,),
    )

    return {
        "pendientes_vencidos": vencidos,
        "sin_actividad": sin_actividad,
        "sin_simulacion": sin_simulacion,
        "notificaciones_olvidadas": (notif[0]["total"] if notif else 0),
    }


class PatchEscenarioBody(BaseModel):
    activo: bool


@router.patch("/gestion/escenarios/{clave}")
def patch_escenario(clave: str, body: PatchEscenarioBody, ctx: dict = Depends(view_ctx)) -> dict:
    tid = ctx["tenant_id"]
    _exec(
        "update escenarios_simulador set activo=%s where tenant_id=%s and clave=%s",
        (body.activo, tid, clave),
    )
    return {"ok": True}


# ── Mensajería interna masiva ─────────────────────────────────────────────────

class MensajeMasivoBody(BaseModel):
    agente_ids: list[str]
    titulo: str
    cuerpo: str
    tipo: str = "aviso"


@router.post("/gestion/mensajes-internos/masivo")
def enviar_mensaje_masivo(body: MensajeMasivoBody, ctx: dict = Depends(view_ctx)) -> dict:
    """Envía un mensaje interno a una lista de agentes del tenant."""
    tid = ctx["tenant_id"]
    if not body.agente_ids:
        return {"ok": True, "enviado_a": 0}

    # Verifica que los agentes pertenezcan al tenant
    rows = _rows(
        "select id::text from agentes where tenant_id=%s and id = any(%s::uuid[])",
        (tid, body.agente_ids),
    )
    valid_ids = [r["id"] for r in rows]
    if not valid_ids:
        raise HTTPException(status_code=404, detail="No se encontraron agentes válidos")

    for aid in valid_ids:
        _exec(
            "insert into mensajes_internos (tenant_id, destinatario_id, tipo, titulo, cuerpo) "
            "values (%s, %s::uuid, %s, %s, %s)",
            (tid, aid, body.tipo, body.titulo, body.cuerpo),
        )

    logger.info("mensajes_internos.masivo", tenant_id=tid, enviado_a=len(valid_ids))
    return {"ok": True, "enviado_a": len(valid_ids)}


# ── Onboarding — canal WhatsApp (ajustes + contenido) ────────────────────────

class OnboardingGroupBody(BaseModel):
    wa_chat_id: str | None  # null para des-configurar


@router.get("/gestion/ajustes/onboarding-group")
def get_onboarding_group(tenant: str = Depends(require_tenant)) -> dict:
    """Devuelve el grupo WhatsApp configurado como canal de onboarding + lista
    de grupos disponibles capturados en la BD."""
    row = _rows("select onboarding_wa_chat_id from tenants where id = %s", (tenant,))
    current = row[0]["onboarding_wa_chat_id"] if row else None
    groups = _rows(
        "select c.wa_chat_id as id, coalesce(c.name, c.wa_chat_id) as nombre "
        "from chats c where c.tenant_id = %s and c.type = 'group' "
        "order by c.name nulls last",
        (tenant,),
    )
    return {"current": current, "groups": groups}


@router.patch("/gestion/ajustes/onboarding-group")
def set_onboarding_group(body: OnboardingGroupBody, tenant: str = Depends(require_tenant)) -> dict:
    """Designa qué grupo WhatsApp es el canal de onboarding (o lo des-configura)."""
    _exec(
        "update tenants set onboarding_wa_chat_id = %s where id = %s",
        (body.wa_chat_id or None, tenant),
    )
    return {"ok": True, "wa_chat_id": body.wa_chat_id}


@router.get("/gestion/nav-badges")
def nav_badges(ctx: dict = Depends(view_ctx)) -> dict:
    """Conteos rápidos para los badges del menú lateral."""
    tid = ctx["tenant_id"]
    scope = scoped_agente_ids(tid, ctx["scope_root"])

    def _safe(sql: str, params: tuple) -> int:
        try:
            rows = _rows(sql, params)
            return (rows[0]["n"] if rows else 0) or 0
        except Exception:
            return 0

    sc_risk, sp_risk = _scope("a.id", scope)
    agentes_riesgo = _safe(
        "select count(*)::int as n from agentes a "
        "where a.tenant_id = %s and a.estado <> 'baja'" + sc_risk +
        " and (select coalesce(round(avg(case when ep.estado='completado' then 100 else 0 end)),0)::int "
        "      from etapa_progreso ep where ep.agente_id = a.id) < 40",
        (tid, *sp_risk),
    )
    mensajes_nuevos = _safe(
        "select count(*)::int as n from messages m "
        "left join message_triage mt on mt.message_id = m.id "
        "where m.tenant_id = %s and coalesce(mt.status,'new') = 'new'",
        (tid,),
    )
    faltaron = _safe(
        "select count(*)::int as n from capacitacion_asistencia ca "
        "join capacitaciones k on k.id = ca.capacitacion_id "
        "where k.tenant_id = %s and ca.asistio = false "
        "and k.id = (select id from capacitaciones where tenant_id = %s "
        "            and fecha <= now() order by fecha desc limit 1)",
        (tid, tid),
    )
    reuniones_pend = _safe(
        "select count(*)::int as n from reuniones r "
        "where r.tenant_id = %s and coalesce(r.estado_difusion,'pendiente') <> 'enviado' "
        "and r.created_at >= now() - interval '30 days'",
        (tid,),
    )
    return {
        "inicio":       agentes_riesgo,
        "conocimiento": mensajes_nuevos,
        "agentes":      agentes_riesgo,
        "reuniones":    faltaron + reuniones_pend,
    }


@router.get("/gestion/onboarding/contenido")
def get_onboarding_contenido(
    etapa_id: str,
    tenant: str = Depends(require_tenant),
    lang: str = "es",
) -> list:
    """Contenido publicado en una etapa (texto, audio, video, etc.)
    ordenado del más reciente al más antiguo."""
    en = lang == "en"
    nombre_e = "coalesce(e.nombre_en, e.nombre)" if en else "e.nombre"
    return _rows(
        f"select oc.id, oc.tipo, oc.cuerpo, oc.media_url, oc.storage_path, "
        f"oc.ia_confianza, oc.ia_razon, oc.created_at, "
        f"{nombre_e} as etapa_nombre "
        "from onboarding_contenido oc "
        "join capacitacion_etapas e on e.id = oc.etapa_id "
        "where oc.tenant_id = %s and oc.etapa_id = %s::uuid and oc.publicado = true "
        "order by oc.created_at desc",
        (tenant, etapa_id),
    )
