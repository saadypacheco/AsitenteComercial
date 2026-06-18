"""Parseo del payload real de WAHA (motor NOWEB): tipo anidado en `_data.message`,
nombre (`pushName`), número real (vs `@lid`) y filtro de ruido (estados/protocolo).
Muestras tomadas de capturas reales de producción."""
from app.models.waha import WahaMessagePayload

GROUP = "5491154574097-1629737140@g.us"


def _p(**raw):
    return WahaMessagePayload.model_validate(raw)


def test_texto_de_grupo():
    p = _p(id="false_g_1", **{"from": GROUP},
           _data={"key": {"participantAlt": "5491154574097@s.whatsapp.net"},
                  "message": {"conversation": "Hola dede un grupo"},
                  "pushName": "Saady"})
    assert p.type == "text"
    assert p.text == "Hola dede un grupo"
    assert p.push_name == "Saady"
    assert p.is_group is True
    assert p.sender_jid == "5491154574097@s.whatsapp.net"   # número real, no el @lid
    assert p.is_noise is False


def test_audio_de_grupo_detecta_tipo():
    p = _p(id="false_g_2", **{"from": GROUP},
           _data={"key": {"participant": "139234316951746@lid"},
                  "message": {"audioMessage": {"ptt": True, "seconds": 1}},
                  "pushName": "Saady"})
    assert p.type == "audio"          # antes caía como "text"
    assert p.is_noise is False


def test_directo_usa_numero_real():
    p = _p(id="false_d_1", **{"from": "139234316951746@lid"},
           _data={"key": {"remoteJidAlt": "5491154574097@s.whatsapp.net"},
                  "message": {"conversation": "Hola soy cecilia"},
                  "pushName": "Saady"})
    assert p.type == "text"
    assert p.is_group is False
    assert p.sender_jid == "5491154574097@s.whatsapp.net"


def test_estado_es_ruido():
    p = _p(id="x", **{"from": "status@broadcast"},
           _data={"message": {"videoMessage": {"seconds": 31}}})
    assert p.is_noise is True


def test_protocolo_es_ruido():
    p = _p(id="y", **{"from": "5491151400092@c.us", "fromMe": True},
           _data={"message": {"protocolMessage": {"type": "APP_STATE_SYNC_KEY_SHARE"}}})
    assert p.is_noise is True


def test_payload_plano_sigue_andando():
    """Backward-compat: payload viejo/plano (con `type`, sin `_data`)."""
    p = _p(id="z", **{"from": "549111@c.us"}, type="text", body="hola")
    assert p.type == "text"
    assert p.text == "hola"
    assert p.is_noise is False
