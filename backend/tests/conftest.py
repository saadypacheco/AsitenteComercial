"""Fixtures de test para la captura (US1).

FakeRepo implementa el Protocol CaptureRepo en memoria → permite testear la lógica
de captura sin BD viva. La cola se mockea para no tocar Postgres.
"""
import pytest


class FakeRepo:
    """Repositorio en memoria que simula el esquema de captura."""

    OBSERVER_SESSION = "obs-123@c.us"

    def __init__(self):
        self.tenant_id = "tenant-1"
        self.messages: dict[tuple[str, str], str] = {}   # (tenant, wa_message_id) -> message_id
        self.contacts: dict[str, str] = {}
        self.chats: dict[str, str] = {}
        self.media: list[dict] = []
        self.triage: list[str] = []
        self.states: list[dict] = []
        self._seq = 0

    def _next_id(self, prefix: str) -> str:
        self._seq += 1
        return f"{prefix}-{self._seq}"

    # --- CaptureRepo ---
    def get_tenant_id_by_session(self, session_jid: str) -> str | None:
        return self.tenant_id if session_jid == self.OBSERVER_SESSION else None

    def upsert_contact(self, tenant_id, wa_jid, display_name) -> str:
        return self.contacts.setdefault(wa_jid, self._next_id("contact"))

    def upsert_chat(self, tenant_id, wa_chat_id, type_, name) -> str:
        return self.chats.setdefault(wa_chat_id, self._next_id("chat"))

    def insert_message(self, row) -> bool:
        key = (row["tenant_id"], row["wa_message_id"])
        if key in self.messages:
            return False  # duplicado (idempotencia)
        self.messages[key] = self._next_id("msg")
        return True

    def insert_media(self, row) -> None:
        self.media.append(row)

    def insert_triage(self, message_id, tenant_id) -> None:
        self.triage.append(message_id)

    def insert_message_state(self, row) -> None:
        self.states.append(row)

    def get_message_id(self, tenant_id, wa_message_id) -> str | None:
        return self.messages.get((tenant_id, wa_message_id))


@pytest.fixture
def repo():
    return FakeRepo()


@pytest.fixture(autouse=True)
def _no_real_queue(monkeypatch):
    """Evita que la cola toque Postgres en los tests; registra los enqueue."""
    calls = []
    monkeypatch.setattr("app.services.capture.queue.enqueue",
                        lambda message_id, tenant_id: calls.append((message_id, tenant_id)))
    return calls


@pytest.fixture
def enqueued(_no_real_queue):
    return _no_real_queue


def make_message_event(wa_id="wamid.AAA", body="hola", type_="chat", session=FakeRepo.OBSERVER_SESSION):
    return {
        "event": "message",
        "session": session,
        "payload": {
            "id": wa_id,
            "from": "12345@g.us",
            "participant": "5491100000000@c.us",
            "type": type_,
            "body": body,
            "timestamp": 1717718400,
        },
    }
