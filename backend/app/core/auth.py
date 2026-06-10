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
    if user.get("agente_id"):
        payload["agente_id"] = str(user["agente_id"])
    if user.get("scope_agente_id"):           # líder acotado a un sub-árbol del equipo
        payload["scope"] = str(user["scope_agente_id"])
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
    if user.get("agente_id"):
        payload["agente_id"] = str(user["agente_id"])
        payload["rol"] = "agente"
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


def require_agent(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    """Dependencia para la app del agente: exige rol 'agente' y devuelve sus ids."""
    if not creds:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        p = _decode(creds.credentials)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Token inválido o expirado") from exc
    if p.get("rol") != "agente" or not p.get("agente_id"):
        raise HTTPException(status_code=403, detail="Acceso restringido a agentes")
    return {"agente_id": p["agente_id"], "tenant_id": p["tenant_id"], "nombre": p.get("nombre")}


def view_ctx(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    """Contexto de vista del panel: tenant + scope (None=owner ve todo; si hay scope,
    el líder ve solo su sub-árbol de agentes)."""
    if not creds:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        p = _decode(creds.credentials)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Token inválido o expirado") from exc
    return {"tenant_id": p["tenant_id"], "scope_root": p.get("scope")}


def assert_agente_in_scope(tenant_id: str, scope_root: str | None, agente_id: str | None) -> None:
    """403 si el líder intenta operar sobre un agente fuera de su equipo. Owner: no-op."""
    if not agente_id or not scope_root:
        return
    scope = scoped_agente_ids(tenant_id, scope_root) or []
    if str(agente_id) not in scope:
        raise HTTPException(status_code=403, detail="Ese agente no es de tu equipo")


def require_owner(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> str:
    """Solo el owner (líder sin scope) puede operar. Devuelve tenant_id."""
    if not creds:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        p = _decode(creds.credentials)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Token inválido o expirado") from exc
    if p.get("scope") or p.get("rol") not in (None, "lider"):
        raise HTTPException(status_code=403, detail="Solo disponible para la dueña de la cuenta")
    return p["tenant_id"]


def scoped_agente_ids(tenant_id: str, scope_root: str | None) -> list[str] | None:
    """IDs del equipo visible: None = todos (owner); si hay scope, el sub-árbol
    (el agente raíz + todos sus subordinados, recursivo por superior_id)."""
    if not scope_root:
        return None
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "with recursive sub as ("
            "  select id from agentes where id = %s and tenant_id = %s "
            "  union select a.id from agentes a join sub on a.superior_id = sub.id) "
            "select id from sub",
            (scope_root, tenant_id),
        )
        return [str(r[0]) for r in cur.fetchall()]


def get_agente_by_identifier(identifier: str) -> dict | None:
    """Busca un agente por email o celular (para emitir su magic link)."""
    ident = (identifier or "").strip()
    if not ident:
        return None
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "select id, tenant_id, nombre, apellido, email, celular from agentes "
            "where (lower(email) = lower(%s) or celular = %s) and estado <> 'baja' limit 1",
            (ident, ident),
        )
        row = cur.fetchone()
        if not row:
            return None
        cols = ["id", "tenant_id", "nombre", "apellido", "email", "celular"]
        return dict(zip(cols, row))


# ── Acceso a la tabla de usuarios (psycopg directo, como el resto del backend) ─
def _connect():
    import psycopg

    if not settings.database_url:
        raise HTTPException(status_code=503, detail="DATABASE_URL no configurado")
    return psycopg.connect(settings.database_url)


def get_user_by_email(email: str) -> dict | None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "select id, tenant_id, email, password_hash, nombre, rol, activo, agente_id "
            "from app_users where email = %s",
            (email.lower().strip(),),
        )
        row = cur.fetchone()
        if not row:
            return None
        cols = ["id", "tenant_id", "email", "password_hash", "nombre", "rol", "activo", "agente_id"]
        u = dict(zip(cols, row))
        u["scope_agente_id"] = u.get("agente_id")  # líder: su nodo de la jerarquía
        return u


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
            # Owner (Cecilia) — ve todo (agente_id NULL)
            cur.execute("select 1 from app_users where email = %s", (settings.default_lider_email,))
            if not cur.fetchone():
                cur.execute(
                    "insert into app_users (tenant_id, email, password_hash, nombre, rol) "
                    "values (%s, %s, %s, %s, 'lider')",
                    (DEMO_TENANT, settings.default_lider_email,
                     hash_password(settings.default_lider_password), "Cecilia"),
                )
                logger.info("auth.seed.ok", email=settings.default_lider_email)

            # Líder demo — acotado al equipo de Juan (su sub-árbol)
            has_agente_col = False
            cur.execute("select 1 from information_schema.columns where table_name='app_users' and column_name='agente_id'")
            has_agente_col = cur.fetchone() is not None
            if has_agente_col:
                cur.execute("select id from agentes where tenant_id = %s and lower(email) = 'juan@demo.com' limit 1", (DEMO_TENANT,))
                juan = cur.fetchone()
                cur.execute("select 1 from app_users where email = 'lider@demo.com'")
                if juan and not cur.fetchone():
                    cur.execute(
                        "insert into app_users (tenant_id, email, password_hash, nombre, rol, agente_id) "
                        "values (%s, 'lider@demo.com', %s, 'Juan (líder)', 'lider', %s)",
                        (DEMO_TENANT, hash_password(settings.default_lider_password), juan[0]),
                    )
                    logger.info("auth.seed.lider", email="lider@demo.com")
            conn.commit()
    except Exception as exc:  # noqa: BLE001
        logger.warning("auth.seed.error", error=str(exc))
