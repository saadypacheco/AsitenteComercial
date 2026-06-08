"""API de gestión (rebanada F-002): CRUD de pendientes/acciones + lista de agentes.

Todo filtrado por el tenant del JWT (FR-009). Las etiquetas de catálogo
(tipo/prioridad/estado) viajan como claves y las localiza el frontend; los textos
libres (título) se devuelven en el idioma pedido cuando hay traducción (titulo_en).
"""
import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import require_tenant
from app.core.config import settings

router = APIRouter()
logger = structlog.get_logger()

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
def list_agentes(tenant: str = Depends(require_tenant)) -> list:
    """Agentes activos/inactivos con datos de contacto + coordenadas para el mapa."""
    return _rows(
        "select a.id, a.nombre, a.apellido, a.celular, a.email, a.estado, a.ciudad, "
        "a.region, a.idioma, a.superior_id, a.lat, a.lng, "
        "(select count(*) from pendientes p where p.agente_id = a.id and p.estado <> 'cerrado') as abiertas, "
        "(select count(*) from pendientes p where p.agente_id = a.id and p.estado = 'cerrado') as cerrados, "
        "nullif(trim(coalesce(s.nombre,'') || ' ' || coalesce(s.apellido,'')), '') as superior "
        "from agentes a left join agentes s on s.id = a.superior_id "
        "where a.tenant_id = %s and a.estado <> 'baja' "
        "order by a.nombre, a.apellido",
        (tenant,),
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
def create_agente(body: AgenteBody, tenant: str = Depends(require_tenant)) -> dict:
    if not body.nombre.strip():
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    row = _exec(
        "insert into agentes (tenant_id, nombre, apellido, celular, email, ciudad, region, "
        "superior_id, estado, lat, lng, origen_alta) "
        "values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'manual') returning id",
        (tenant, body.nombre.strip(), body.apellido, body.celular, body.email, body.ciudad,
         body.region, body.superior_id or None, body.estado, body.lat, body.lng),
    )
    return {"id": str(row[0])}


@router.patch("/gestion/agentes/{aid}")
def update_agente(aid: str, body: AgenteBody, tenant: str = Depends(require_tenant)) -> dict:
    if body.estado not in ESTADOS_AGENTE:
        raise HTTPException(status_code=400, detail="Estado inválido")
    _exec(
        "update agentes set nombre=%s, apellido=%s, celular=%s, email=%s, ciudad=%s, region=%s, "
        "superior_id=%s, estado=%s, lat=%s, lng=%s where id=%s and tenant_id=%s",
        (body.nombre.strip(), body.apellido, body.celular, body.email, body.ciudad, body.region,
         body.superior_id or None, body.estado, body.lat, body.lng, aid, tenant),
    )
    return {"ok": True}


@router.post("/gestion/agentes/{aid}/baja")
def baja_agente(aid: str, tenant: str = Depends(require_tenant)) -> dict:
    """Baja lógica: estado='baja' + fecha_baja (no se borra, conserva historial)."""
    _exec(
        "update agentes set estado='baja', fecha_baja=current_date where id=%s and tenant_id=%s",
        (aid, tenant),
    )
    return {"ok": True}


# ── Pendientes / acciones ─────────────────────────────────────────────────────
@router.get("/gestion/pendientes")
def list_pendientes(tenant: str = Depends(require_tenant), lang: str = "es") -> dict:
    en = lang == "en"
    prog = _rows(
        "select count(*) filter (where estado = 'cerrado') as cerrados, "
        "count(*) filter (where estado <> 'cerrado') as abiertos, "
        "count(*) filter (where estado <> 'cerrado' and prioridad = 'critico') as criticos, "
        "count(*) filter (where estado <> 'cerrado' and agente_id is null) as sin_asignar, "
        "count(*) as total from pendientes where tenant_id = %s",
        (tenant,),
    )[0]
    total = prog["total"] or 1
    prog["pct"] = round(prog["cerrados"] / total * 100)
    titulo_expr = "coalesce(p.titulo_en, p.titulo)" if en else "p.titulo"
    cliente_expr = "coalesce(p.cliente_en, p.cliente)" if en else "p.cliente"
    items = _rows(
        f"select p.id, {titulo_expr} as titulo, {cliente_expr} as cliente, p.vip, "
        "p.tipo, p.prioridad, p.estado, p.created_at, p.fecha_cierre, p.agente_id, "
        "round(extract(epoch from now()-p.created_at)/3600)::int as horas, "
        "nullif(trim(coalesce(a.nombre,'') || ' ' || coalesce(a.apellido,'')), '') as agente "
        "from pendientes p left join agentes a on a.id = p.agente_id "
        "where p.tenant_id = %s and p.estado <> 'cerrado' "
        "order by case p.prioridad when 'critico' then 0 when 'alto' then 1 "
        "when 'medio' then 2 else 3 end, p.created_at",
        (tenant,),
    )
    return {"progreso": prog, "items": items}


class PendienteCreate(BaseModel):
    titulo: str
    tipo: str = "seguimiento"
    prioridad: str = "medio"
    agente_id: str | None = None


@router.post("/gestion/pendientes")
def create_pendiente(body: PendienteCreate, tenant: str = Depends(require_tenant)) -> dict:
    if not body.titulo.strip():
        raise HTTPException(status_code=400, detail="El título es obligatorio")
    if body.tipo not in TIPOS or body.prioridad not in PRIORIDADES:
        raise HTTPException(status_code=400, detail="Tipo o prioridad inválidos")
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
def update_pendiente(pid: str, body: PendienteUpdate, tenant: str = Depends(require_tenant)) -> dict:
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


# ── Capacitaciones (lista con asistencia) ─────────────────────────────────────
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
