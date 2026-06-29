"""API del Briefing diario (Feature E) — config + preview + envío de prueba + historial.

Config a nivel TENANT (no por líder): el briefing es de la dueña. Filtrado por el
tenant del JWT (FR-009). La composición/envío vive en services/briefing.py (que el
worker también usa para el disparo automático).
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.gestion import _exec, _rows
from app.core.auth import require_tenant
from app.services import briefing, waha

router = APIRouter()


@router.get("/dashboard/briefing/config")
def get_config(tenant: str = Depends(require_tenant)) -> dict:
    row = _rows(
        "select owner_wa_jid, briefing_enabled, briefing_hora from tenants where id=%s", (tenant,)
    )
    cfg = row[0] if row else {}
    return {
        "owner_wa_jid": cfg.get("owner_wa_jid"),
        "briefing_enabled": cfg.get("briefing_enabled", True),
        "briefing_hora": cfg.get("briefing_hora", 18),
        "waha_enabled": waha.enabled(),   # False → los envíos van en modo simulado
    }


class BriefingConfig(BaseModel):
    owner_wa_jid: str | None = None
    briefing_enabled: bool = True
    briefing_hora: int = 18               # 0..23 (hora ET de disparo)


@router.put("/dashboard/briefing/config")
def put_config(body: BriefingConfig, tenant: str = Depends(require_tenant)) -> dict:
    jid = (body.owner_wa_jid or "").strip() or None
    hora = max(0, min(23, body.briefing_hora))
    _exec(
        "update tenants set owner_wa_jid=%s, briefing_enabled=%s, briefing_hora=%s where id=%s",
        (jid, body.briefing_enabled, hora, tenant),
    )
    return {"ok": True}


@router.get("/dashboard/briefing/preview")
def preview(tenant: str = Depends(require_tenant), lang: str = "es") -> dict:
    """Texto del briefing tal como se enviaría hoy (sin enviar)."""
    return {"texto": briefing.compose_text(tenant, "en" if lang == "en" else "es")}


@router.post("/dashboard/briefing/enviar")
def enviar(tenant: str = Depends(require_tenant), lang: str = "es") -> dict:
    """Envía el briefing AHORA (prueba manual). Modo simulado si no hay número conectado."""
    return briefing.send_now(tenant, "en" if lang == "en" else "es", tipo="manual")


@router.get("/dashboard/briefing/historial")
def historial(tenant: str = Depends(require_tenant)) -> list:
    return _rows(
        "select fecha, tipo, modo, jid, created_at from briefing_log "
        "where tenant_id=%s order by created_at desc limit 10", (tenant,),
    )
