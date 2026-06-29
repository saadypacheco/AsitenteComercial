"""Tests de auth (FR-009): hashing de contraseña + JWT de sesión + magic link."""
import pytest

from app.core import auth


def test_password_hash_roundtrip():
    h = auth.hash_password("secret123")
    assert auth.verify_password("secret123", h)
    assert not auth.verify_password("incorrecta", h)


def test_verify_password_malformado_no_explota():
    assert auth.verify_password("x", "no-es-un-hash-valido") is False


def test_token_de_sesion_lleva_tenant():
    user = {"id": "u1", "email": "a@b.com", "tenant_id": "t-99", "nombre": "Ana", "rol": "lider"}
    payload = auth._decode(auth.make_token(user))
    assert payload["tenant_id"] == "t-99"
    assert payload["email"] == "a@b.com"


def test_magic_token_tiene_proposito_y_no_se_confunde_con_sesion():
    user = {"id": "u1", "email": "a@b.com", "tenant_id": "t-99"}
    magic = auth.make_magic_token(user)
    assert auth.decode_magic_token(magic)["purpose"] == "magic"

    # un token de sesión normal NO debe validar como magic link
    normal = auth.make_token({**user, "nombre": "Ana", "rol": "lider"})
    with pytest.raises(ValueError):
        auth.decode_magic_token(normal)
