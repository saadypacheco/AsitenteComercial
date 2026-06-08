"""Repositorio de captura: encapsula los accesos a Supabase para la ingesta.

Aislar el acceso a datos detrás de un Protocol permite (a) testear la lógica de
captura con un repo falso sin BD viva, y (b) cambiar de BaaS sin tocar la lógica
(ADR: capa de datos desacoplada). El backend usa SIEMPRE el service_role.

Ref: specs/001-captura-whatsapp-bd/data-model.md
"""
from __future__ import annotations

from typing import Protocol

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
