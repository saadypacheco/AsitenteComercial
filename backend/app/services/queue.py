"""Cola durable entre captura y procesamiento (Principio IV: nada se pierde).

Abstrae el backend de cola para no acoplar el worker:
  - 'pgmq'  → extensión pgmq sobre el mismo Postgres (recomendado, 0002_queue.sql).
  - 'table' → fallback con tabla `processing_jobs` + FOR UPDATE SKIP LOCKED.

Se elige por `settings.queue_backend`. Usa psycopg sincrónico contra DATABASE_URL;
el worker async lo invoca vía `asyncio.to_thread` para no bloquear el loop.

Ref: research.md (R2), contracts/webhook-waha.md
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import structlog

from app.core.config import settings

logger = structlog.get_logger()


@dataclass
class QueueJob:
    """Un job leído de la cola. `handle` identifica el mensaje en la cola para el ack."""

    handle: int                 # msg_id (pgmq) o id (tabla)
    attempts: int               # nº de lecturas/intentos (para dead-letter)
    payload: dict[str, Any]     # { "message_id": "...", "tenant_id": "..." }


def _connect():
    # Import perezoso: solo la ruta real de cola necesita psycopg (los tests usan FakeRepo).
    import psycopg

    if not settings.database_url:
        raise RuntimeError("DATABASE_URL no configurado: la cola necesita acceso directo a Postgres")
    return psycopg.connect(settings.database_url, autocommit=True)


# --------------------------------------------------------------------------- #
# Enqueue (lo llama la captura tras persistir el mensaje)
# --------------------------------------------------------------------------- #
def enqueue(message_id: str, tenant_id: str) -> None:
    from psycopg.types.json import Jsonb

    body = {"message_id": message_id, "tenant_id": tenant_id}
    with _connect() as conn, conn.cursor() as cur:
        if settings.queue_backend == "pgmq":
            cur.execute("select pgmq.send(%s, %s)", (settings.queue_name, Jsonb(body)))
        else:
            cur.execute(
                "insert into processing_jobs (tenant_id, message_id) values (%s, %s)",
                (tenant_id, message_id),
            )
    logger.info("queue.enqueue", backend=settings.queue_backend, message_id=message_id)


# --------------------------------------------------------------------------- #
# Read / ack / dead-letter (los usa el worker)
# --------------------------------------------------------------------------- #
def read_batch(qty: int = 10, vt_seconds: int = 60) -> list[QueueJob]:
    """Toma hasta `qty` jobs, ocultándolos `vt_seconds` (visibility timeout)."""
    with _connect() as conn, conn.cursor() as cur:
        if settings.queue_backend == "pgmq":
            cur.execute(
                "select msg_id, read_ct, message from pgmq.read(%s, %s, %s)",
                (settings.queue_name, vt_seconds, qty),
            )
            return [QueueJob(handle=r[0], attempts=r[1], payload=r[2]) for r in cur.fetchall()]
        # Fallback tabla: marca 'processing' atómicamente
        cur.execute(
            """
            update processing_jobs set status='processing', attempts=attempts+1, updated_at=now()
            where id in (
                select id from processing_jobs where status='queued'
                order by created_at limit %s for update skip locked
            )
            returning id, attempts, tenant_id, message_id
            """,
            (qty,),
        )
        return [
            QueueJob(handle=r[0], attempts=r[1], payload={"tenant_id": str(r[2]), "message_id": str(r[3])})
            for r in cur.fetchall()
        ]


def ack(job: QueueJob) -> None:
    """Confirma el procesamiento exitoso: saca el job de la cola."""
    with _connect() as conn, conn.cursor() as cur:
        if settings.queue_backend == "pgmq":
            cur.execute("select pgmq.delete(%s, %s)", (settings.queue_name, job.handle))
        else:
            cur.execute("update processing_jobs set status='done', updated_at=now() where id=%s", (job.handle,))


def to_dead_letter(job: QueueJob, error: str) -> None:
    """Aísla un job que falló demasiadas veces (no se pierde, se archiva)."""
    with _connect() as conn, conn.cursor() as cur:
        if settings.queue_backend == "pgmq":
            cur.execute("select pgmq.archive(%s, %s)", (settings.queue_name, job.handle))
        else:
            cur.execute(
                "update processing_jobs set status='failed', last_error=%s, updated_at=now() where id=%s",
                (error, job.handle),
            )
    logger.warning("queue.dead_letter", handle=job.handle, attempts=job.attempts, error=error)
