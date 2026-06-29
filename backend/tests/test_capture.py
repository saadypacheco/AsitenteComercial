"""T015/T016 [US1] — Captura completa (SC-001) y Principio I (SC-005)."""
from app.services import capture
from tests.conftest import make_message_event


def test_captura_persiste_mensaje_triage_y_encola(repo, enqueued):
    """SC-001: un evento produce 1 mensaje + triage + 1 job, con raw = payload completo."""
    event = make_message_event(wa_id="wamid.OK", body="vendí una póliza")

    result = capture.handle_message(event, repo=repo)

    assert result["captured"] is True
    assert len(repo.messages) == 1                       # mensaje persistido
    assert len(repo.triage) == 1                         # triage 'new'
    assert len(enqueued) == 1                            # job encolado (durabilidad)
    # message_id encolado == el persistido
    assert enqueued[0][0] == result["message_id"]


def test_media_no_texto_registra_metadata_sin_analizar(repo, enqueued):
    """FR-016: imagen/doc/etc. registran metadata en media, sin procesar contenido."""
    event = make_message_event(wa_id="wamid.IMG", type_="image", body=None)
    event["payload"]["hasMedia"] = True
    event["payload"]["mimeType"] = "image/jpeg"

    capture.handle_message(event, repo=repo)

    assert len(repo.media) == 1
    assert repo.media[0]["mime_type"] == "image/jpeg"
    assert repo.media[0]["downloaded"] is False          # la descarga la hace el worker (US3)


def test_principio_I_sesion_no_observadora_se_rechaza(repo, enqueued):
    """SC-005: un evento de una sesión que no es el número observador NO se captura."""
    event = make_message_event(wa_id="wamid.BAD", session="otro-numero@c.us")

    result = capture.handle_message(event, repo=repo)

    assert result["captured"] is False
    assert result["reason"] == "session_no_es_observador"
    assert len(repo.messages) == 0                       # nada persistido
    assert len(enqueued) == 0                            # nada encolado


def test_edicion_es_inmutable_y_va_a_message_states(repo, enqueued):
    """FR-017: una edición no muta el mensaje; se registra como nuevo estado."""
    original = make_message_event(wa_id="wamid.EDIT", body="precio 100")
    capture.handle_message(original, repo=repo)

    edit = {
        "event": "message.edited",
        "session": repo.OBSERVER_SESSION,
        "payload": {"id": "wamid.EDIT", "body": "precio 120"},
    }
    result = capture.handle_message(edit, repo=repo)

    assert result["state"] == "edited"
    assert len(repo.messages) == 1                       # el original sigue único e intacto
    assert len(repo.states) == 1 and repo.states[0]["new_body"] == "precio 120"
