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
    capacitacion_id: str | None = None


class ActualizarBody(BaseModel):
    resumen_aprobado: str | None = None
    capacitacion_id: str | None = None


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
        "insert into reunion_actas (tenant_id, titulo, tipo, zoom_meeting_id, transcripcion, resumen, temas, acciones, fuente, capacitacion_id) "
        "values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) returning id",
        (tenant, body.titulo.strip(), body.tipo, body.zoom_meeting_id, texto, out["resumen"],
         Jsonb(out["temas"]), Jsonb(acciones_full), "simulado", body.capacitacion_id),
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
        "select id, titulo, tipo, fecha, resumen, resumen_aprobado, temas, acciones, fuente, "
        "       capacitacion_id, estado_difusion, created_at "
        "from reunion_actas where id=%s and tenant_id=%s", (rid, ctx["tenant_id"]),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Acta no encontrada")
    return rows[0]


@router.patch("/gestion/reuniones/{rid}")
def actualizar(rid: str, body: ActualizarBody, ctx: dict = Depends(view_ctx)) -> dict:
    tenant = ctx["tenant_id"]
    rows = _rows("select id from reunion_actas where id=%s and tenant_id=%s", (rid, tenant))
    if not rows:
        raise HTTPException(status_code=404, detail="Acta no encontrada")
    updates, params = [], []
    if body.resumen_aprobado is not None:
        updates.append("resumen_aprobado = %s")
        params.append(body.resumen_aprobado)
    if body.capacitacion_id is not None:
        updates.append("capacitacion_id = %s")
        params.append(body.capacitacion_id)
    if not updates:
        raise HTTPException(status_code=400, detail="Nada para actualizar")
    params.extend([rid, tenant])
    _exec(f"update reunion_actas set {', '.join(updates)} where id=%s and tenant_id=%s", tuple(params))
    return {"ok": True}


@router.post("/gestion/reuniones/{rid}/difundir")
def difundir(rid: str, ctx: dict = Depends(view_ctx)) -> dict:
    from psycopg.types.json import Jsonb
    tenant = ctx["tenant_id"]
    actas = _rows(
        "select ra.id, ra.titulo, ra.resumen_aprobado, ra.resumen, ra.capacitacion_id, ra.estado_difusion "
        "from reunion_actas ra where ra.id=%s and ra.tenant_id=%s",
        (rid, tenant),
    )
    if not actas:
        raise HTTPException(status_code=404, detail="Acta no encontrada")
    acta = actas[0]
    if acta["estado_difusion"] == "enviado":
        raise HTTPException(status_code=400, detail="Ya fue difundida")

    cuerpo = acta["resumen_aprobado"] or acta["resumen"] or ""
    titulo = f"Resumen de reunión: {acta['titulo']}"

    # Get all active agents as recipients
    destinatarios = _rows(
        "select id from agentes where tenant_id=%s and estado!='baja'", (tenant,)
    )

    for dest in destinatarios:
        _exec(
            "insert into mensajes_internos (tenant_id, reunion_acta_id, destinatario_id, tipo, titulo, cuerpo) "
            "values (%s,%s,%s,'resumen_reunion',%s,%s)",
            (tenant, rid, dest["id"], titulo, cuerpo),
        )

    _exec(
        "update reunion_actas set estado_difusion='enviado' where id=%s and tenant_id=%s",
        (rid, tenant),
    )
    return {"ok": True, "enviado_a": len(destinatarios)}


@router.get("/gestion/notificaciones")
def notificaciones(ctx: dict = Depends(view_ctx)) -> list:
    tenant = ctx["tenant_id"]
    return _rows(
        "select mi.id, mi.tipo, mi.titulo, mi.cuerpo, mi.leido, mi.created_at, "
        "       ra.titulo as reunion_titulo "
        "from mensajes_internos mi "
        "left join reunion_actas ra on ra.id = mi.reunion_acta_id "
        "where mi.tenant_id=%s "
        "order by mi.created_at desc limit 50",
        (tenant,),
    )


@router.patch("/gestion/notificaciones/{nid}/leer")
def marcar_leido(nid: str, ctx: dict = Depends(view_ctx)) -> dict:
    _exec(
        "update mensajes_internos set leido=true where id=%s and tenant_id=%s",
        (nid, ctx["tenant_id"]),
    )
    return {"ok": True}


@router.get("/gestion/reuniones-pendientes-difusion")
def pendientes_difusion(ctx: dict = Depends(view_ctx)) -> list:
    """Actas procesadas hace >2h que aún no se difundieron — para la alerta de Cecilia."""
    return _rows(
        "select id, titulo, tipo, created_at "
        "from reunion_actas "
        "where tenant_id=%s and estado_difusion='pendiente' "
        "and created_at < now() - interval '2 hours' "
        "order by created_at asc",
        (ctx["tenant_id"],),
    )
