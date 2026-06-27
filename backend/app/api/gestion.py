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
        # progreso onboarding
        "(select round(coalesce(avg(case when ep.estado='completado' then 100 else 0 end),0))::int "
        " from etapa_progreso ep where ep.agente_id = a.id) as pct_onboarding, "
        "(select ce.nombre from etapa_progreso ep "
        " join capacitacion_etapas ce on ce.id = ep.etapa_id "
        " where ep.agente_id = a.id and ep.estado = 'en_curso' limit 1) as etapa_actual "
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
