"""Endpoints de autenticación (FR-009): login de la líder + perfil actual."""
import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core import auth as authcore

router = APIRouter()
logger = structlog.get_logger()


class LoginBody(BaseModel):
    email: str
    password: str


@router.post("/auth/login")
def login(body: LoginBody) -> dict:
    user = authcore.get_user_by_email(body.email)
    if not user or not user["activo"] or not authcore.verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return {
        "access_token": authcore.make_token(user),
        "user": {"email": user["email"], "nombre": user["nombre"], "rol": user["rol"]},
    }


@router.get("/auth/me")
def me(user: dict = Depends(authcore.current_user)) -> dict:
    return {"email": user.get("email"), "nombre": user.get("nombre"), "rol": user.get("rol")}
