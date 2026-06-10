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
    assert_agente_in_scope, hash_password, require_owner, require_tenant, scoped_agente_ids, view_ctx,
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


def _conn():
    import psycopg

    if not settings.database_url:
        raise HTTPException(status_code=503, detail="DATABASE_URL no configurado")
    return psycopg.connect(settings.database_url)


def _rows(sql: str, params: tuple = ()):  # -> list[dict]
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        cols = [c.name for c in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]


def _exec(sql: str, params: tuple = ()):
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone() if cur.description else None
        conn.commit()
        return row


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
        "(select count(*) from pendientes p where p.agente_id = a.id and p.estado <> 'cerrado') as abiertas, "
        "(select count(*) from pendientes p where p.agente_id = a.id and p.estado = 'cerrado') as cerrados, "
        "exists (select 1 from app_users u where u.agente_id = a.id and u.rol = 'lider') as es_lider, "
        "nullif(trim(coalesce(s.nombre,'') || ' ' || coalesce(s.apellido,'')), '') as superior "
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
