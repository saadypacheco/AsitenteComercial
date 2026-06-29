"""Registro de actividad de la plataforma (activity_log).
Fire-and-forget: el frontend llama este endpoint sin esperar respuesta crítica.
Si falla, no bloquea al usuario — se captura en silencio.
"""
import structlog
from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.gestion import _exec
from app.core import auth as authcore

router = APIRouter()
logger = structlog.get_logger()
_bearer = HTTPBearer(auto_error=False)


@router.post("/log/evento")
def log_evento(
    body: dict,
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    """Registra un evento de uso. Acepta requests sin token (ej: antes del login)
    pero en ese caso no asocia tenant ni user."""
    try:
        user: dict | None = None
        if creds:
            try:
                user = authcore._decode(creds.credentials)
            except Exception:
                pass

        tenant_id = (user or {}).get("tenant_id") or body.get("tenant_id")
        if not tenant_id:
            return {"ok": True}  # sin tenant no podemos guardar

        user_id   = (user or {}).get("sub")
        agente_id = (user or {}).get("agente_id")
        rol       = (user or {}).get("rol") or body.get("rol") or "desconocido"
        evento    = (body.get("evento") or "").strip()[:64]
        detalle   = body.get("detalle") if isinstance(body.get("detalle"), dict) else None

        if not evento:
            return {"ok": True}

        _exec(
            "insert into activity_log (tenant_id, user_id, agente_id, rol, evento, detalle) "
            "values (%s, %s, %s, %s, %s, %s)",
            (tenant_id, user_id or None, agente_id or None, rol, evento, detalle),
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("log.evento.error", error=str(exc))

    return {"ok": True}


@router.get("/log/uso")
def uso_resumen(ctx: dict = Depends(authcore.view_ctx)) -> dict:
    """Resumen de uso para el panel de Cecilia. Últimos 30 días."""
    from app.api.gestion import _rows
    tenant = ctx["tenant_id"]

    sesiones = _rows(
        "select rol, count(*) as total, count(distinct user_id) as usuarios_unicos "
        "from activity_log "
        "where tenant_id = %s and evento = 'login' and created_at > now() - interval '30 days' "
        "group by rol",
        (tenant,),
    )

    por_dia = _rows(
        "select date_trunc('day', created_at)::date as dia, rol, count(*) as eventos "
        "from activity_log "
        "where tenant_id = %s and created_at > now() - interval '30 days' "
        "group by dia, rol order by dia",
        (tenant,),
    )

    top_eventos = _rows(
        "select evento, count(*) as total "
        "from activity_log "
        "where tenant_id = %s and created_at > now() - interval '30 days' "
        "group by evento order by total desc limit 10",
        (tenant,),
    )

    agentes_activos = _rows(
        "select count(distinct agente_id) as n "
        "from activity_log "
        "where tenant_id = %s and rol = 'agente' and created_at > now() - interval '30 days'",
        (tenant,),
    )

    return {
        "sesiones_por_rol": sesiones,
        "actividad_por_dia": [
            {**r, "dia": r["dia"].isoformat() if hasattr(r["dia"], "isoformat") else str(r["dia"])}
            for r in por_dia
        ],
        "top_eventos": top_eventos,
        "agentes_activos_30d": (agentes_activos[0]["n"] if agentes_activos else 0),
    }
