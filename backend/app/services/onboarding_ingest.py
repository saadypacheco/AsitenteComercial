"""Servicio de ingesta de contenido de onboarding desde WhatsApp.

Flujo:
  1. capture.py detecta que el mensaje viene del grupo onboarding del tenant.
  2. Este módulo toma el mensaje, obtiene las etapas del tenant y llama a Gemini
     para clasificar a qué etapa pertenece el contenido.
  3. Persiste en onboarding_contenido.
  4. Envía notificación interna al líder con el resultado.

Si no hay GEMINI_API_KEY, clasifica a la primera etapa con confianza 0
y deja la nota en ia_razon para que Cecilia lo reasigne manualmente.
"""

import structlog

from app.core.config import settings
from app.db import pool as _pool

logger = structlog.get_logger()

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _rows(sql: str, params: tuple = ()):
    return _pool.rows(sql, params)

def _exec(sql: str, params: tuple = ()):
    return _pool.execute(sql, params)


def get_tenant_onboarding_chat(tenant_id: str) -> str | None:
    """Devuelve el wa_chat_id configurado como canal de onboarding, si existe."""
    rows = _rows(
        "select onboarding_wa_chat_id from tenants where id = %s",
        (tenant_id,),
    )
    return rows[0]["onboarding_wa_chat_id"] if rows else None


def get_etapas(tenant_id: str) -> list[dict]:
    """Lista de etapas del tenant ordenadas."""
    return _rows(
        "select id::text, nombre, nombre_en, orden from capacitacion_etapas "
        "where tenant_id = %s order by orden",
        (tenant_id,),
    )


def get_leader_app_user_id(tenant_id: str) -> str | None:
    """ID del app_user líder del tenant (para enviar notificación interna)."""
    rows = _rows(
        "select au.id::text from app_users au "
        "join tenants t on t.id = au.tenant_id "
        "where au.tenant_id = %s and au.rol = 'lider' "
        "order by au.created_at limit 1",
        (tenant_id,),
    )
    return rows[0]["id"] if rows else None


# ---------------------------------------------------------------------------
# Clasificador IA
# ---------------------------------------------------------------------------

def _classify_with_ai(content_text: str, etapas: list[dict]) -> dict:
    """
    Llama a Gemini para clasificar el contenido en una etapa.
    Retorna {'etapa_id': str, 'confianza': float, 'razon': str}.
    """
    if not etapas:
        return {"etapa_id": None, "confianza": 0.0, "razon": "No hay etapas configuradas"}

    if not settings.gemini_api_key or not content_text:
        # Sin IA: asignar a la primera etapa como fallback
        return {
            "etapa_id": etapas[0]["id"],
            "confianza": 0.0,
            "razon": "Sin clasificación IA — asignado a la primera etapa por defecto",
        }

    etapas_desc = "\n".join(
        f"  {i+1}. ID={e['id']} · {e['nombre']}"
        + (f" / {e['nombre_en']}" if e.get("nombre_en") else "")
        for i, e in enumerate(etapas)
    )

    prompt = f"""Sos un asistente de onboarding comercial. El líder del equipo acaba de enviar
el siguiente contenido para publicar en el programa de capacitación:

---
{content_text[:1200]}
---

Las etapas del programa son:
{etapas_desc}

Respondé SOLO con un JSON válido con exactamente estas claves:
{{
  "etapa_id": "<el ID exacto de la etapa más apropiada>",
  "confianza": <número entre 0.0 y 1.0>,
  "razon": "<1 oración explicando por qué>"
}}

No agregues nada más. Solo el JSON."""

    try:
        import litellm
        resp = litellm.completion(
            model=settings.llm_model,
            api_key=settings.gemini_api_key,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=200,
        )
        raw = resp["choices"][0]["message"]["content"].strip()
        # Limpiar markdown si Gemini lo envuelve
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        import json
        result = json.loads(raw)
        # Validar que el etapa_id exista en la lista
        valid_ids = {e["id"] for e in etapas}
        if result.get("etapa_id") not in valid_ids:
            raise ValueError(f"etapa_id desconocido: {result.get('etapa_id')}")
        return {
            "etapa_id": result["etapa_id"],
            "confianza": float(result.get("confianza", 0.5)),
            "razon": result.get("razon", ""),
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("onboarding_ingest.classify_error", error=str(exc))
        return {
            "etapa_id": etapas[0]["id"],
            "confianza": 0.0,
            "razon": f"Error de clasificación IA — asignado a la primera etapa. ({exc})",
        }


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------

def process_onboarding_message(
    *,
    tenant_id: str,
    message_id: str,
    tipo: str,
    body: str | None,
    media_url: str | None,
    mime_type: str | None,
) -> dict:
    """
    Punto de entrada desde capture.py.
    Clasifica y persiste el contenido. Envía notificación interna al líder.
    """
    etapas = get_etapas(tenant_id)
    if not etapas:
        logger.warning("onboarding_ingest.sin_etapas", tenant_id=tenant_id)
        return {"ok": False, "reason": "no_etapas"}

    # Para clasificar usamos el texto disponible:
    #   - texto directo si tipo=text
    #   - caption (body) si es media con descripción
    #   - vacío si es audio puro (la transcripción llega después vía worker)
    content_for_classification = (body or "").strip()

    classification = _classify_with_ai(content_for_classification, etapas)
    etapa_id = classification["etapa_id"]

    # Buscar nombre de la etapa para la notificación
    etapa_nombre = next(
        (e["nombre"] for e in etapas if e["id"] == etapa_id),
        "Etapa desconocida",
    )

    # Persistir en onboarding_contenido
    rows = _rows(
        """
        insert into onboarding_contenido
          (tenant_id, etapa_id, tipo, cuerpo, media_url, mensaje_id, ia_confianza, ia_razon)
        values (%s, %s::uuid, %s, %s, %s, %s::uuid, %s, %s)
        returning id::text
        """,
        (
            tenant_id, etapa_id, tipo,
            content_for_classification or None,
            media_url,
            message_id,
            classification["confianza"],
            classification["razon"],
        ),
    )
    contenido_id = rows[0]["id"] if rows else None

    # Notificación interna al líder
    confianza_pct = int(classification["confianza"] * 100)
    if confianza_pct >= 70:
        titulo = f"✅ Publicado en {etapa_nombre}"
        cuerpo = (
            f"El contenido de tipo '{tipo}' fue publicado automáticamente "
            f"en la etapa '{etapa_nombre}' (confianza {confianza_pct}%)."
        )
    else:
        titulo = f"⚠️ Publicado en {etapa_nombre} (revisá)"
        cuerpo = (
            f"El contenido fue asignado a '{etapa_nombre}' con baja confianza ({confianza_pct}%). "
            f"Motivo: {classification['razon']}. Podés reasignarlo desde la pantalla de Capacitaciones."
        )

    try:
        _exec(
            """
            insert into mensajes_internos (tenant_id, destinatario_id, tipo, titulo, cuerpo)
            select %s, au.id, 'onboarding_publicado', %s, %s
            from app_users au
            where au.tenant_id = %s and au.rol = 'lider'
            order by au.created_at limit 1
            """,
            (tenant_id, titulo, cuerpo, tenant_id),
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("onboarding_ingest.notif_error", error=str(exc))

    logger.info(
        "onboarding_ingest.publicado",
        tenant_id=tenant_id,
        etapa_id=etapa_id,
        etapa=etapa_nombre,
        tipo=tipo,
        confianza=classification["confianza"],
        contenido_id=contenido_id,
    )
    return {
        "ok": True,
        "etapa_id": etapa_id,
        "etapa_nombre": etapa_nombre,
        "confianza": classification["confianza"],
        "contenido_id": contenido_id,
    }
