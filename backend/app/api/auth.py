"""Endpoints de autenticación (FR-009): login + recuperación por magic link."""
import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core import auth as authcore
from app.core.config import settings

router = APIRouter()
logger = structlog.get_logger()


class LoginBody(BaseModel):
    email: str
    password: str


class MagicRequestBody(BaseModel):
    email: str


class MagicVerifyBody(BaseModel):
    token: str


def _session(user: dict) -> dict:
    return {
        "access_token": authcore.make_token(user),
        "user": {
            "email": user["email"], "nombre": user["nombre"], "rol": user["rol"],
            # 'equipo' = líder acotado a su sub-árbol; 'todo' = owner (ve toda la org).
            "alcance": "equipo" if user.get("agente_id") else "todo",
        },
    }


@router.post("/auth/login")
def login(body: LoginBody) -> dict:
    user = authcore.get_user_by_email(body.email)
    if not user or not user["activo"] or not authcore.verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return _session(user)


@router.post("/auth/magic-link/request")
def magic_request(body: MagicRequestBody) -> dict:
    """Genera un magic link para entrar sin contraseña.

    Para no filtrar qué emails existen, SIEMPRE responde ok. En dev (sin SMTP)
    devolvemos el link directamente para poder probarlo; en prod se enviaría por
    email y `link` quedaría en None.
    """
    user = authcore.get_user_by_email(body.email)
    resp: dict = {"ok": True, "ttl_minutes": settings.magic_ttl_minutes}
    if user and user["activo"]:
        token = authcore.make_magic_token(user)
        link = f"{settings.frontend_url}/magic?token={token}"
        logger.info("auth.magic.request", email=user["email"])
        if settings.environment == "development":
            resp["link"] = link            # solo dev: para probar sin email
    return resp


@router.post("/auth/magic-link/verify")
def magic_verify(body: MagicVerifyBody) -> dict:
    """Canjea el magic link por una sesión normal."""
    try:
        payload = authcore.decode_magic_token(body.token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Enlace inválido o expirado") from exc
    user = authcore.get_user_by_email(payload.get("email", ""))
    if not user or not user["activo"]:
        raise HTTPException(status_code=401, detail="Usuario no válido")
    return _session(user)


@router.get("/auth/me")
def me(user: dict = Depends(authcore.current_user)) -> dict:
    return {"email": user.get("email"), "nombre": user.get("nombre"), "rol": user.get("rol")}
