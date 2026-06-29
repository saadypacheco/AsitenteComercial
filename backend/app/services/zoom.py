"""Asistencia automática de Zoom (ANDAMIAJE — listo para enchufar credenciales).

Flujo objetivo: al terminar una capacitación, se lee el reporte de participantes
de Zoom y se marca la asistencia por agente (match por email), sin intervención.

Estados:
  - SIN credenciales (hoy): `enabled()` = False. La reconciliación funciona en modo
    SIMULADO (se le pasa una lista de participantes) → permite probar el pipeline
    completo sin cuenta Zoom, igual que el webhook simulado de WAHA.
  - CON credenciales (Server-to-Server OAuth): `fetch_participants` llama la
    Reports API real (GET /report/meetings/{id}/participants).

Qué falta para producción: cuenta Zoom Pro + app Server-to-Server OAuth
(account_id, client_id, client_secret) + definir el host. Ver core/config.py.
"""
import structlog

from app.core.config import settings

logger = structlog.get_logger()

_ZOOM_API = "https://api.zoom.us/v2"
_ZOOM_OAUTH = "https://zoom.us/oauth/token"


def enabled() -> bool:
    return bool(settings.zoom_account_id and settings.zoom_client_id and settings.zoom_client_secret)


def _access_token() -> str | None:
    """Token Server-to-Server OAuth (account_credentials). None si no hay credenciales."""
    if not enabled():
        return None
    try:
        import base64

        import httpx

        basic = base64.b64encode(f"{settings.zoom_client_id}:{settings.zoom_client_secret}".encode()).decode()
        resp = httpx.post(
            _ZOOM_OAUTH,
            params={"grant_type": "account_credentials", "account_id": settings.zoom_account_id},
            headers={"Authorization": f"Basic {basic}"},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()["access_token"]
    except Exception as exc:  # noqa: BLE001
        logger.warning("zoom.token_error", error=str(exc))
        return None


def fetch_participants(meeting_id: str) -> list[dict] | None:
    """Reporte de participantes de Zoom: [{email, name, minutos}]. None si no se pudo."""
    token = _access_token()
    if not token or not meeting_id:
        return None
    try:
        import httpx

        out: list[dict] = []
        url = f"{_ZOOM_API}/report/meetings/{meeting_id}/participants"
        params = {"page_size": 300}
        with httpx.Client(timeout=20, headers={"Authorization": f"Bearer {token}"}) as c:
            while True:
                r = c.get(url, params=params)
                r.raise_for_status()
                data = r.json()
                for p in data.get("participants", []):
                    out.append({
                        "email": (p.get("user_email") or "").strip(),
                        "name": p.get("name"),
                        "minutos": round((p.get("duration") or 0) / 60),
                    })
                if data.get("next_page_token"):
                    params["next_page_token"] = data["next_page_token"]
                else:
                    break
        return out
    except Exception as exc:  # noqa: BLE001
        logger.warning("zoom.report_error", error=str(exc))
        return None


def _conn():
    import psycopg

    if not settings.database_url:
        raise RuntimeError("DATABASE_URL no configurado")
    return psycopg.connect(settings.database_url, autocommit=True)


def reconcile(capacitacion_id: str, tenant_id: str, participants: list[dict], min_minutos: int | None = None) -> int:
    """Marca asistencia: match participante (email) → agente → capacitacion_asistencia.
    Devuelve cuántos se marcaron. Idempotente (upsert)."""
    minimo = settings.zoom_min_minutos if min_minutos is None else min_minutos
    marcados = 0
    with _conn() as c, c.cursor() as cur:
        for p in participants or []:
            email = (p.get("email") or "").strip().lower()
            minutos = p.get("minutos", p.get("minutes", 0)) or 0
            if not email or minutos < minimo:
                continue
            cur.execute(
                "select id from agentes where tenant_id = %s and lower(email) = %s and estado <> 'baja' limit 1",
                (tenant_id, email),
            )
            row = cur.fetchone()
            if not row:
                continue
            cur.execute(
                "insert into capacitacion_asistencia (capacitacion_id, agente_id, asistio) "
                "values (%s, %s, true) on conflict (capacitacion_id, agente_id) do update set asistio = true",
                (capacitacion_id, str(row[0])),
            )
            marcados += 1
    logger.info("zoom.reconcile", capacitacion=capacitacion_id, participantes=len(participants or []), marcados=marcados)
    return marcados
