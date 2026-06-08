"""Health endpoint para debug remoto (lesson KB: api-health-endpoint-para-debug-remoto)."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    # TODO: chequear conexión a Postgres y estado de la sesión del bridge (WAHA)
    return {"status": "ok", "service": "mentorcomercial", "bridge": "unknown"}
