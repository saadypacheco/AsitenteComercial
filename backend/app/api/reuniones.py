"""Reuniones que se procesan solas (Feature B): de la transcripción → acta con
resumen + temas + acciones, y las acciones se materializan como pendientes.

La transcripción se pega (modo demo) o llega de Zoom (Cloud Recording, cuando estén
las credenciales). El owner ve todas las reuniones; las tareas creadas respetan el
equipo del líder (se asignan dentro de su sub-árbol).
"""
import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.gestion import _exec, _rows
from app.core.auth import scoped_agente_ids, view_ctx
from app.services import meeting

router = APIRouter()
logger = structlog.get_logger()

TIPOS = ("formacion", "lideres", "otro")


def _match_agente(titulo: str, agentes: list[dict]) -> dict | None:
    low = titulo.lower()
    for a in agentes:
        nombre = (a["nombre"] or "").lower()
        if nombre and nombre in low:
            return a
    return None


class ProcesarBody(BaseModel):
    titulo: str
    tipo: str = "lideres"
    transcripcion: str | None = None
    zoom_meeting_id: str | None = None


@router.post("/gestion/reuniones/procesar")
def procesar(body: ProcesarBody, ctx: dict = Depends(view_ctx), lang: str = "es") -> dict:
    from psycopg.types.json import Jsonb

    tenant, scope_root = ctx["tenant_id"], ctx["scope_root"]
    if not body.titulo.strip():
        raise HTTPException(status_code=400, detail="Falta el título de la reunión")
    if body.tipo not in TIPOS:
        raise HTTPException(status_code=400, detail="Tipo inválido")
    texto = (body.transcripcion or "").strip()
    if not texto:
        # TODO(zoom): si hay credenciales + zoom_meeting_id → bajar el transcript real.
        raise HTTPException(status_code=400, detail="Pegá la transcripción (o conectá Zoom)")

    out = meeting.process_transcript(texto, lang)

    scope = scoped_agente_ids(tenant, scope_root)
    agentes = _rows("select id, nombre, apellido from agentes where tenant_id=%s and estado<>'baja'", (tenant,))

    acciones_full = []
    for ac in out["acciones"]:
        m = _match_agente(ac["titulo"], agentes)
        agente_id = None
        agente_nombre = None
        if m:
            agente_nombre = f"{m['nombre']} {m.get('apellido') or ''}".strip()
            if scope is None or str(m["id"]) in scope:
                agente_id = str(m["id"])
        # líder: si no se asignó a nadie de su equipo, la tarea queda para él
        if agente_id is None and scope_root:
            agente_id = scope_root
        row = _exec(
            "insert into pendientes (tenant_id, agente_id, titulo, tipo, prioridad, estado, creado_por) "
            "values (%s,%s,%s,'tarea','medio','pendiente','ia') returning id",
            (tenant, agente_id, ac["titulo"]),
        )
        acciones_full.append({"titulo": ac["titulo"], "agente": agente_nombre, "pendiente_id": str(row[0])})

    acta = _exec(
        "insert into reunion_actas (tenant_id, titulo, tipo, zoom_meeting_id, transcripcion, resumen, temas, acciones, fuente) "
        "values (%s,%s,%s,%s,%s,%s,%s,%s,%s) returning id",
        (tenant, body.titulo.strip(), body.tipo, body.zoom_meeting_id, texto, out["resumen"],
         Jsonb(out["temas"]), Jsonb(acciones_full), "simulado"),
    )
    logger.info("reunion.procesada", acciones=len(acciones_full))
    return {"id": str(acta[0]), "resumen": out["resumen"], "temas": out["temas"],
            "acciones": acciones_full, "n_pendientes": len(acciones_full)}


@router.get("/gestion/reuniones")
def listar(ctx: dict = Depends(view_ctx)) -> list:
    return _rows(
        "select id, titulo, tipo, fecha, resumen, jsonb_array_length(acciones) as n_acciones "
        "from reunion_actas where tenant_id=%s order by created_at desc limit 30",
        (ctx["tenant_id"],),
    )


@router.get("/gestion/reuniones/{rid}")
def detalle(rid: str, ctx: dict = Depends(view_ctx)) -> dict:
    rows = _rows(
        "select id, titulo, tipo, fecha, resumen, temas, acciones, fuente "
        "from reunion_actas where id=%s and tenant_id=%s", (rid, ctx["tenant_id"]),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Acta no encontrada")
    return rows[0]
