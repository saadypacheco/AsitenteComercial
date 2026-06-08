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


# ── Agentes (lista básica; el CRUD completo + mapa va en gestion de agentes) ──
@router.get("/gestion/agentes")
def list_agentes(tenant: str = Depends(require_tenant)) -> list:
    return _rows(
        "select id, nombre, apellido, estado from agentes "
        "where tenant_id = %s and estado <> 'baja' order by nombre, apellido",
        (tenant,),
    )


# ── Pendientes / acciones ─────────────────────────────────────────────────────
@router.get("/gestion/pendientes")
def list_pendientes(tenant: str = Depends(require_tenant), lang: str = "es") -> dict:
    en = lang == "en"
    prog = _rows(
        "select count(*) filter (where estado = 'cerrado') as cerrados, "
        "count(*) filter (where estado <> 'cerrado') as abiertos, count(*) as total "
        "from pendientes where tenant_id = %s",
        (tenant,),
    )[0]
    total = prog["total"] or 1
    prog["pct"] = round(prog["cerrados"] / total * 100)
    titulo_expr = "coalesce(p.titulo_en, p.titulo)" if en else "p.titulo"
    items = _rows(
        f"select p.id, {titulo_expr} as titulo, p.tipo, p.prioridad, p.estado, "
        "p.created_at, p.fecha_cierre, p.agente_id, "
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
    estado: str


@router.patch("/gestion/pendientes/{pid}")
def update_pendiente(pid: str, body: PendienteUpdate, tenant: str = Depends(require_tenant)) -> dict:
    if body.estado not in ESTADOS:
        raise HTTPException(status_code=400, detail="Estado inválido")
    _exec(
        "update pendientes set estado = %s, "
        "fecha_cierre = case when %s = 'cerrado' then now() else null end "
        "where id = %s and tenant_id = %s",
        (body.estado, body.estado, pid, tenant),
    )
    return {"ok": True}


@router.delete("/gestion/pendientes/{pid}")
def delete_pendiente(pid: str, tenant: str = Depends(require_tenant)) -> dict:
    _exec("delete from pendientes where id = %s and tenant_id = %s", (pid, tenant))
    return {"ok": True}
