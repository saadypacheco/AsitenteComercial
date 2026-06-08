"""Endpoints de lectura del dashboard "¿Qué pasó hoy?" (US2).

El frontend consume estos endpoints (en lugar de PostgREST directo) para no exigir
el stack Auth/PostgREST de Supabase en local y para resolver el acceso sin login
todavía. Reusan las funciones SQL de la migración 0005 (ventana ET server-side).

NOTA (decisión local F-001): el filtrado por tenant lo hará la sesión autenticada
cuando exista el login; hoy, en single-tenant, el backend lee con DATABASE_URL.
Ref: specs/001-captura-whatsapp-bd/contracts/dashboard-api.md
"""
import structlog
from fastapi import APIRouter, HTTPException

from app.core.config import settings

router = APIRouter()
logger = structlog.get_logger()


def _query_scalar(sql: str, params: tuple | None = None):
    import psycopg

    if not settings.database_url:
        raise HTTPException(status_code=503, detail="DATABASE_URL no configurado")
    try:
        with psycopg.connect(settings.database_url) as conn, conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            return row[0] if row else None
    except Exception as exc:  # noqa: BLE001
        logger.error("dashboard.query_error", error=str(exc))
        raise HTTPException(status_code=500, detail="error consultando la base") from exc


@router.get("/dashboard/daily")
def daily_summary() -> dict:
    """Resumen del día (sección hecho): volumen, por grupo, lo más reciente."""
    return _query_scalar("select daily_summary()") or {}


@router.get("/dashboard/chat/{chat_id}")
def chat_detail(chat_id: str) -> list:
    """Detalle de un chat HOY (ventana ET)."""
    return _query_scalar("select daily_chat_detail(%s)", (chat_id,)) or []
