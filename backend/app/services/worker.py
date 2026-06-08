"""Worker de procesamiento IA. Consume la cola durable ('ai_processing').

Arranque:  python -m app.services.worker

Por cada job:
  a. (US3) si el message es audio → transcripción (Whisper self-host) → transcriptions
  b. (US4) extracción de eventos comerciales (LiteLLM) → commercial_events + event_sources
  c. (F2) embedding → message_embeddings  (RAG)

Robustez (Principio IV): la cola es durable; un job que falla N veces va a
dead-letter (no se pierde, se aísla); backoff entre rondas vacías.

Estado F-001/US1: loop base de consumo + ack + dead-letter. Las etapas (a) y (b)
se conectan en US3 y US4 respectivamente — acá quedan como puntos de extensión.
"""
import asyncio

import structlog

from app.core.config import settings
from app.services import queue

logger = structlog.get_logger()

_IDLE_BACKOFF_S = 5      # espera cuando la cola está vacía
_BATCH = 10


def _process_job(job: queue.QueueJob) -> None:
    """Procesa un job. En US1 solo valida/loguea; US3 y US4 enganchan acá.

    Mantener IDEMPOTENTE: reprocesar el mismo message_id no debe duplicar datos
    (las inserciones aguas abajo usan claves naturales / on conflict).
    """
    message_id = job.payload.get("message_id")
    logger.info("worker.job", message_id=message_id, attempts=job.attempts)
    # TODO(US3): if message.type == 'audio' → transcription.transcribe → insert transcriptions
    # TODO(US4): extracción de eventos vía ai.extract_events → commercial_events + event_sources


def _run_once() -> int:
    """Una ronda de consumo (sincrónica). Devuelve cuántos jobs procesó."""
    jobs = queue.read_batch(qty=_BATCH)
    for job in jobs:
        try:
            _process_job(job)
            queue.ack(job)
        except Exception as exc:  # noqa: BLE001 — aislar el job, no tumbar el worker
            if job.attempts >= settings.queue_max_attempts:
                queue.to_dead_letter(job, error=str(exc))
            else:
                # No se ackea: el visibility timeout lo devuelve a la cola para reintento.
                logger.warning("worker.job_retry", handle=job.handle, attempts=job.attempts, error=str(exc))
    return len(jobs)


async def run() -> None:
    logger.info("worker.start", queue=settings.queue_name, backend=settings.queue_backend)
    while True:
        processed = await asyncio.to_thread(_run_once)
        if processed == 0:
            await asyncio.sleep(_IDLE_BACKOFF_S)


if __name__ == "__main__":
    asyncio.run(run())
