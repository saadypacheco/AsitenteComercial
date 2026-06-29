"""Repositorio de captura: encapsula los accesos a Supabase para la ingesta.

Aislar el acceso a datos detrás de un Protocol permite (a) testear la lógica de
captura con un repo falso sin BD viva, y (b) cambiar de BaaS sin tocar la lógica
(ADR: capa de datos desacoplada). El backend usa SIEMPRE el service_role.

Ref: specs/001-captura-whatsapp-bd/data-model.md
"""
from __future__ import annotations

from typing import Protocol

from app.core.config import settings
from app.db.session import get_supabase


class CaptureRepo(Protocol):
    """Contrato mínimo que la captura necesita de la base de datos."""

    def get_tenant_id_by_session(self, session_jid: str) -> str | None: ...
    def upsert_contact(self, tenant_id: str, wa_jid: str, display_name: str | None) -> str: ...
    def upsert_chat(self, tenant_id: str, wa_chat_id: str, type_: str, name: str | None) -> str: ...
    def insert_message(self, row: dict) -> bool: ...                # True si insertó (False = duplicado)
    def insert_media(self, row: dict) -> None: ...
    def insert_triage(self, message_id: str, tenant_id: str) -> None: ...
    def insert_message_state(self, row: dict) -> None: ...
    def get_message_id(self, tenant_id: str, wa_message_id: str) -> str | None: ...


class SupabaseRepo:
    """Implementación real sobre Supabase self-hosted (service_role)."""

    def __init__(self, client=None):
        self._db = client or get_supabase()

    def get_tenant_id_by_session(self, session_jid: str) -> str | None:
        res = self._db.table("tenants").select("id").eq("ia_wa_jid", session_jid).limit(1).execute()
        return res.data[0]["id"] if res.data else None

    def upsert_contact(self, tenant_id: str, wa_jid: str, display_name: str | None) -> str:
        row = {"tenant_id": tenant_id, "wa_jid": wa_jid, "display_name": display_name}
        res = self._db.table("contacts").upsert(row, on_conflict="tenant_id,wa_jid").execute()
        return res.data[0]["id"]

    def upsert_chat(self, tenant_id: str, wa_chat_id: str, type_: str, name: str | None) -> str:
        row = {"tenant_id": tenant_id, "wa_chat_id": wa_chat_id, "type": type_, "name": name}
        res = self._db.table("chats").upsert(row, on_conflict="tenant_id,wa_chat_id").execute()
        return res.data[0]["id"]

    def insert_message(self, row: dict) -> bool:
        # Idempotencia: on conflict (tenant_id, wa_message_id) do nothing.
        res = (
            self._db.table("messages")
            .upsert(row, on_conflict="tenant_id,wa_message_id", ignore_duplicates=True)
            .execute()
        )
        return bool(res.data)  # vacío = ya existía (duplicado), no se reinserta

    def insert_media(self, row: dict) -> None:
        self._db.table("media").insert(row).execute()

    def insert_triage(self, message_id: str, tenant_id: str) -> None:
        self._db.table("message_triage").upsert(
            {"message_id": message_id, "tenant_id": tenant_id, "status": "new"},
            on_conflict="message_id",
            ignore_duplicates=True,
        ).execute()

    def insert_message_state(self, row: dict) -> None:
        self._db.table("message_states").insert(row).execute()

    def get_message_id(self, tenant_id: str, wa_message_id: str) -> str | None:
        res = (
            self._db.table("messages")
            .select("id")
            .eq("tenant_id", tenant_id)
            .eq("wa_message_id", wa_message_id)
            .limit(1)
            .execute()
        )
        return res.data[0]["id"] if res.data else None


class PsycopgRepo:
    """Implementación de captura sobre Postgres directo (psycopg) para LOCAL/self-host
    sin el stack PostgREST/Auth de Supabase. Misma decisión que el dashboard.
    Conecta con DATABASE_URL (service-role equivalente: superusuario, bypassa RLS).
    """

    def _pg(self):
        import psycopg

        if not settings.database_url:
            raise RuntimeError("DATABASE_URL no configurado")
        return psycopg.connect(settings.database_url, autocommit=True)

    def get_tenant_id_by_session(self, session_jid: str) -> str | None:
        with self._pg() as c, c.cursor() as cur:
            cur.execute("select id from tenants where ia_wa_jid = %s limit 1", (session_jid,))
            r = cur.fetchone()
            return str(r[0]) if r else None

    def upsert_contact(self, tenant_id: str, wa_jid: str, display_name: str | None) -> str:
        with self._pg() as c, c.cursor() as cur:
            cur.execute(
                "insert into contacts (tenant_id, wa_jid, display_name) values (%s, %s, %s) "
                "on conflict (tenant_id, wa_jid) do update set "
                "display_name = coalesce(excluded.display_name, contacts.display_name) returning id",
                (tenant_id, wa_jid, display_name),
            )
            return str(cur.fetchone()[0])

    def upsert_chat(self, tenant_id: str, wa_chat_id: str, type_: str, name: str | None) -> str:
        with self._pg() as c, c.cursor() as cur:
            cur.execute(
                "insert into chats (tenant_id, wa_chat_id, type, name) values (%s, %s, %s, %s) "
                "on conflict (tenant_id, wa_chat_id) do update set "
                "name = coalesce(excluded.name, chats.name) returning id",
                (tenant_id, wa_chat_id, type_, name),
            )
            return str(cur.fetchone()[0])

    def insert_message(self, row: dict) -> bool:
        from psycopg.types.json import Jsonb

        params = {**row, "raw": Jsonb(row.get("raw") or {})}
        with self._pg() as c, c.cursor() as cur:
            cur.execute(
                "insert into messages (tenant_id, wa_message_id, chat_id, sender_id, direction, "
                "type, body, quoted_msg_id, wa_timestamp, raw) values "
                "(%(tenant_id)s, %(wa_message_id)s, %(chat_id)s, %(sender_id)s, %(direction)s, "
                "%(type)s, %(body)s, %(quoted_msg_id)s, %(wa_timestamp)s, %(raw)s) "
                "on conflict (tenant_id, wa_message_id) do nothing returning id",
                params,
            )
            return cur.fetchone() is not None

    def insert_media(self, row: dict) -> None:
        with self._pg() as c, c.cursor() as cur:
            cur.execute(
                "insert into media (tenant_id, message_id, mime_type, downloaded) "
                "values (%(tenant_id)s, %(message_id)s, %(mime_type)s, %(downloaded)s)",
                {"mime_type": None, "downloaded": False, **row},
            )

    def insert_triage(self, message_id: str, tenant_id: str) -> None:
        with self._pg() as c, c.cursor() as cur:
            cur.execute(
                "insert into message_triage (message_id, tenant_id, status) values (%s, %s, 'new') "
                "on conflict (message_id) do nothing",
                (message_id, tenant_id),
            )

    def insert_message_state(self, row: dict) -> None:
        from psycopg.types.json import Jsonb

        with self._pg() as c, c.cursor() as cur:
            cur.execute(
                "insert into message_states (tenant_id, message_id, state, new_body, raw) "
                "values (%s, %s, %s, %s, %s)",
                (row["tenant_id"], row["message_id"], row["state"], row.get("new_body"), Jsonb(row.get("raw") or {})),
            )

    def get_message_id(self, tenant_id: str, wa_message_id: str) -> str | None:
        with self._pg() as c, c.cursor() as cur:
            cur.execute(
                "select id from messages where tenant_id = %s and wa_message_id = %s limit 1",
                (tenant_id, wa_message_id),
            )
            r = cur.fetchone()
            return str(r[0]) if r else None


def get_capture_repo() -> CaptureRepo:
    """Elige el repo de captura: Supabase si está configurado, si no Postgres directo."""
    if settings.supabase_url and settings.supabase_service_role_key:
        return SupabaseRepo()
    return PsycopgRepo()
