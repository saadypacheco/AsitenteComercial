"""T014 [US1] — Idempotencia de captura (SC-002: 0 duplicados)."""
from app.services import capture
from tests.conftest import make_message_event


def test_mismo_wa_message_id_no_duplica(repo, enqueued):
    event = make_message_event(wa_id="wamid.DUP")

    first = capture.handle_message(event, repo=repo)
    second = capture.handle_message(event, repo=repo)  # reintento del bridge

    assert first["captured"] is True and first["duplicate"] is False
    assert second["captured"] is True and second["duplicate"] is True
    # Una sola fila persistida para ese wa_message_id (SC-002).
    assert len(repo.messages) == 1
    # El duplicado NO se reencola (no se reprocesa dos veces).
    assert len(enqueued) == 1
