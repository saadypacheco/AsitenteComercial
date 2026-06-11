"""mentorcomercial · API de captura + memoria comercial.

Arranque local:  uvicorn app.main:app --reload --port 8002
(Hostinger usa 8000=tienda, 8001=dentales → mentorcomercial = 8002)
"""
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import agente, auth, briefing, command, dashboard, gestion, health, reuniones, webhook
from app.core import auth as authcore
from app.core.config import settings

logger = structlog.get_logger()

app = FastAPI(title="mentorcomercial API", version="0.1.0")

# CORS: el dashboard (Next.js) llama a estos endpoints desde el navegador.
# En dev abrimos todo; en prod se restringe al dominio del frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.environment == "development" else [],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(auth.router, tags=["auth"])
app.include_router(webhook.router, prefix="/ingest", tags=["captura"])
app.include_router(dashboard.router, tags=["dashboard"])
app.include_router(gestion.router, tags=["gestion"])
app.include_router(command.router, tags=["command"])
app.include_router(agente.router, tags=["agente"])
app.include_router(reuniones.router, tags=["reuniones"])
app.include_router(briefing.router, tags=["briefing"])


@app.on_event("startup")
async def startup() -> None:
    authcore.ensure_default_user()
    logger.info("api.startup", service="mentorcomercial")
