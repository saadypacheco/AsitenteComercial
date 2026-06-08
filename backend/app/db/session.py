"""Acceso a datos desacoplado (permite migrar a self-host o cambiar BaaS sin tocar
la lógica de negocio — ADR: capa de datos desacoplada).

El backend usa el SERVICE_ROLE_KEY (bypassa RLS). NUNCA exponer esa key al frontend.
"""
from functools import lru_cache

from app.core.config import settings


@lru_cache(maxsize=1)
def get_supabase():
    # Import perezoso: importar este módulo no debe exigir el paquete supabase
    # (los tests de captura usan un repo falso y no tocan la BaaS).
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)
