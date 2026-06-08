"""Auth self-contained (FR-009): login con sesión JWT que lleva el tenant_id.

NO depende del stack Supabase Auth (decisión local: no montamos Auth/PostgREST).
Hash de contraseña con PBKDF2-SHA256 (stdlib, sin deps extra). JWT firmado HS256.
Cada request al dashboard exige el Bearer y el filtrado por tenant sale del token,
no de un parámetro del cliente (Principio II: aislamiento por tenant).
"""
import hashlib
import hmac
import secrets
import time

import jwt as pyjwt
import structlog
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

logger = structlog.get_logger()

# Tenant de la demo local (mismo que el seed). En prod cada líder tiene el suyo.
DEMO_TENANT = "00000000-0000-0000-0000-0000000000a1"

_bearer = HTTPBearer(auto_error=False)


# ── Password hashing (PBKDF2, sin dependencias) ──────────────────────────────
def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 100_000)
    return f"pbkdf2_sha256$100000${salt}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iters, salt, expected = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iters))
        return hmac.compare_digest(dk.hex(), expected)
    except Exception:  # noqa: BLE001
        return False


# ── JWT ──────────────────────────────────────────────────────────────────────
def make_token(user: dict) -> str:
    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "tenant_id": str(user["tenant_id"]),
        "nombre": user.get("nombre"),
        "rol": user.get("rol", "lider"),
        "exp": int(time.time()) + settings.jwt_ttl_hours * 3600,
    }
    return pyjwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def _decode(token: str) -> dict:
    return pyjwt.decode(token, settings.jwt_secret, algorithms=["HS256"])


def make_magic_token(user: dict) -> str:
    """Token de un solo propósito ('magic'), corto, para login sin contraseña."""
    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "tenant_id": str(user["tenant_id"]),
        "purpose": "magic",
        "exp": int(time.time()) + settings.magic_ttl_minutes * 60,
    }
    return pyjwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_magic_token(token: str) -> dict:
    payload = _decode(token)
    if payload.get("purpose") != "magic":
        raise ValueError("token no es de tipo magic")
    return payload


def require_tenant(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> str:
    """Dependencia: exige Bearer válido y devuelve el tenant_id del token."""
    if not creds:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        return _decode(creds.credentials)["tenant_id"]
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Token inválido o expirado") from exc


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        return _decode(creds.credentials)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Token inválido o expirado") from exc


# ── Acceso a la tabla de usuarios (psycopg directo, como el resto del backend) ─
def _connect():
    import psycopg

    if not settings.database_url:
        raise HTTPException(status_code=503, detail="DATABASE_URL no configurado")
    return psycopg.connect(settings.database_url)


def get_user_by_email(email: str) -> dict | None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "select id, tenant_id, email, password_hash, nombre, rol, activo "
            "from app_users where email = %s",
            (email.lower().strip(),),
        )
        row = cur.fetchone()
        if not row:
            return None
        cols = ["id", "tenant_id", "email", "password_hash", "nombre", "rol", "activo"]
        return dict(zip(cols, row))


def ensure_default_user() -> None:
    """Siembra la líder por defecto si la tabla existe y está vacía (solo dev)."""
    if settings.environment != "development":
        return
    try:
        with _connect() as conn, conn.cursor() as cur:
            cur.execute("select to_regclass('public.app_users')")
            if cur.fetchone()[0] is None:
                logger.info("auth.seed.skip", reason="tabla app_users no existe aún")
                return
            cur.execute("select 1 from app_users where email = %s", (settings.default_lider_email,))
            if cur.fetchone():
                return
            cur.execute(
                "insert into app_users (tenant_id, email, password_hash, nombre, rol) "
                "values (%s, %s, %s, %s, 'lider')",
                (DEMO_TENANT, settings.default_lider_email,
                 hash_password(settings.default_lider_password), "Cecilia"),
            )
            conn.commit()
            logger.info("auth.seed.ok", email=settings.default_lider_email)
    except Exception as exc:  # noqa: BLE001
        logger.warning("auth.seed.error", error=str(exc))
