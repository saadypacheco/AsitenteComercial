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

if settings.sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        integrations=[StarletteIntegration(), FastApiIntegration()],
        traces_sample_rate=0.1,   # 10% de requests trazados (ajustar si escala)
        send_default_pii=False,   # no enviar IPs ni cookies (privacidad)
    )

app = FastAPI(title="mentorcomercial API", version="0.1.0")

# CORS: el dashboard (Next.js) llama a estos endpoints desde el navegador.
# En dev abrimos todo; en prod se restringe al dominio del frontend (FRONTEND_URL),
# aceptando también la variante con/sin www.
if settings.environment == "development":
    _cors_origins = ["*"]
else:
    _base = settings.frontend_url.rstrip("/")
    _cors_origins = [_base]
    if "://" in _base:
        scheme, host = _base.split("://", 1)
        _cors_origins.append(f"{scheme}://www.{host}" if not host.startswith("www.")
                             else f"{scheme}://{host[4:]}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
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
