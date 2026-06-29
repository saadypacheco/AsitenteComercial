"""Endpoints de autenticación (FR-009): login + recuperación por magic link."""
import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core import auth as authcore
from app.core.config import settings
from app.services import email as email_svc

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
    rol = user["rol"]
    resp = {
        "access_token": authcore.make_token(user),
        "user": {
            "email": user["email"],
            "nombre": user["nombre"],
            "rol": rol,
            "alcance": "equipo" if (rol == "lider" and user.get("agente_id")) else "todo",
        },
    }
    if user.get("must_set_password"):
        resp["must_set_password"] = True
    return resp


@router.post("/auth/login")
def login(body: LoginBody) -> dict:
    user = authcore.get_user_by_email(body.email)
    if not user or not user["activo"]:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Usá el magic link para el primer acceso")
    if not authcore.verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return _session(user)


@router.post("/auth/magic-link/request")
def magic_request(body: MagicRequestBody) -> dict:
    """Genera un magic link para entrar sin contraseña (primer acceso o recuperación).

    Para no filtrar qué emails existen, SIEMPRE responde ok. En dev (sin SMTP)
    devolvemos el link directamente para poder probarlo.
    """
    user = authcore.get_user_by_email(body.email)
    resp: dict = {"ok": True, "ttl_minutes": settings.magic_ttl_minutes}
    if user and user["activo"]:
        token = authcore.make_magic_token(user)
        link = f"{settings.frontend_url}/magic?token={token}"
        logger.info("auth.magic.request", email=user["email"])
        email_svc.send_magic_link(user["email"], link)
        if settings.environment == "development":
            resp["link"] = link
    return resp


@router.post("/auth/magic-link/verify")
def magic_verify(body: MagicVerifyBody) -> dict:
    """Canjea el magic link por una sesión. Si must_set_password=true el frontend
    redirige a la pantalla de configuración de contraseña."""
    try:
        payload = authcore.decode_magic_token(body.token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Enlace inválido o expirado") from exc
    user = authcore.get_user_by_email(payload.get("email", ""))
    if not user or not user["activo"]:
        raise HTTPException(status_code=401, detail="Usuario no válido")
    return _session(user)


@router.post("/auth/set-password")
def set_password(body: dict, user: dict = Depends(authcore.current_user)) -> dict:
    """Permite a cualquier usuario (agente o líder) fijar su contraseña tras el primer magic link."""
    password = (body.get("password") or "").strip()
    if len(password) < 6:
        raise HTTPException(status_code=422, detail="La contraseña debe tener al menos 6 caracteres")
    from app.api.gestion import _exec
    _exec(
        "update app_users set password_hash = %s, must_set_password = false where email = %s",
        (authcore.hash_password(password), user["email"]),
    )
    return {"ok": True}


@router.get("/auth/me")
def me(user: dict = Depends(authcore.current_user)) -> dict:
    return {"email": user.get("email"), "nombre": user.get("nombre"), "rol": user.get("rol")}
