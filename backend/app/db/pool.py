"""Pool de conexiones compartido del API.

Por qué existe: el patrón previo abría una conexión psycopg NUEVA por cada consulta.
Contra una DB local eso cuesta ~1 ms; contra una **DB remota (Supabase Cloud)** cada
conexión nueva cuesta cientos de ms (handshake TLS + auth del pooler). El dashboard
dispara ~20 consultas por carga → segundos de latencia. El pool reusa conexiones
"calientes" y elimina ese costo (de ~13 s a ~1-1.5 s la carga del Centro de Control).

Vive en el proceso del API (uvicorn). El worker tiene su propio acceso (autocommit)
para la cola; no comparte este pool.
"""
import threading

from app.core.config import settings

_pool = None
_lock = threading.Lock()


def get_pool():
    """Devuelve el pool (lo crea perezosamente, thread-safe)."""
    global _pool
    if _pool is None:
        with _lock:
            if _pool is None:
                if not settings.database_url:
                    raise RuntimeError("DATABASE_URL no configurado")
                from psycopg_pool import ConnectionPool

                _pool = ConnectionPool(
                    conninfo=settings.database_url,
                    min_size=settings.db_pool_min,
                    max_size=settings.db_pool_max,
                    max_idle=300,        # recicla conexiones ociosas (el pooler corta las viejas)
                    timeout=30,          # espera máx. por una conexión libre
                    reconnect_timeout=5, # reintenta reconectar conexiones caídas hasta 5 s
                    check=ConnectionPool.check_connection,  # valida la conexión antes de entregarla
                    open=True,
                )
    return _pool


def rows(sql: str, params: tuple = ()) -> list[dict]:
    """SELECT → lista de dicts, usando una conexión del pool."""
    with get_pool().connection() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        cols = [c.name for c in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]


def exec_(sql: str, params: tuple = ()):
    """INSERT/UPDATE/DELETE. Devuelve la fila de RETURNING si la hay.
    El context manager del pool hace commit al salir sin excepción."""
    with get_pool().connection() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone() if cur.description else None


def scalar(sql: str, params: tuple | None = None):
    """Primera columna de la primera fila (o None)."""
    with get_pool().connection() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        return row[0] if row else None
