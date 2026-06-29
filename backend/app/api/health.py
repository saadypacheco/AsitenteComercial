"""Health endpoint — valida Postgres y WAHA para UptimeRobot y monitoreo."""
import structlog
from fastapi import APIRouter

from app.db import pool as _pool
from app.services import waha
from app.core.config import settings

router = APIRouter()
logger = structlog.get_logger()


@router.get("/health")
async def health() -> dict:
    # Postgres
    db_ok = False
    try:
        rows = _pool.rows("select 1 as ok")
        db_ok = bool(rows and rows[0]["ok"] == 1)
    except Exception as exc:  # noqa: BLE001
        logger.error("health.db_error", error=str(exc))

    # WAHA (solo si está configurado)
    bridge_status = "disabled"
    if settings.waha_base_url and settings.waha_api_key:
        try:
            info = waha.session_status()
            bridge_status = info.get("status", "unknown")
        except Exception as exc:  # noqa: BLE001
            bridge_status = "error"
            logger.warning("health.waha_error", error=str(exc))

    healthy = db_ok
    return {
        "status": "ok" if healthy else "degraded",
        "service": "mentorcomercial",
        "db": "ok" if db_ok else "error",
        "bridge": bridge_status,
        "environment": settings.environment,
    }
