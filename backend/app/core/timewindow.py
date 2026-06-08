"""Ventana del día comercial en zona fija (FR-018).

"Hoy" se delimita SIEMPRE por la zona del negocio (ET por defecto), no por la zona
del usuario ni la del servidor. Devuelve un rango [inicio, fin) en UTC-aware para
filtrar `messages.wa_timestamp` (timestamptz).

Ref: specs/001-captura-whatsapp-bd/research.md (R6).
"""
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.core.config import settings


def business_day_range(on: datetime | None = None) -> tuple[datetime, datetime]:
    """Rango [inicio, fin) del día comercial que contiene `on` (default: ahora).

    `inicio` = 00:00 de ese día en `settings.business_tz`; `fin` = 00:00 del día
    siguiente. Ambos son datetimes tz-aware (en la zona del negocio); compararlos
    contra una columna timestamptz es correcto sin conversión manual.
    """
    tz = ZoneInfo(settings.business_tz)
    now_local = (on.astimezone(tz) if on else datetime.now(tz))
    start = datetime.combine(now_local.date(), time.min, tzinfo=tz)
    end = start + timedelta(days=1)
    return start, end
