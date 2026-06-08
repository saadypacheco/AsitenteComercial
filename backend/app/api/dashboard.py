"""Endpoints de lectura del dashboard "¿Qué pasó hoy?" (US2).

El frontend consume estos endpoints (en lugar de PostgREST directo) para no exigir
el stack Auth/PostgREST de Supabase en local y para resolver el acceso sin login
todavía. Reusan las funciones SQL de la migración 0005 (ventana ET server-side).

NOTA (decisión local F-001): el filtrado por tenant lo hará la sesión autenticada
cuando exista el login; hoy, en single-tenant, el backend lee con DATABASE_URL.
Ref: specs/001-captura-whatsapp-bd/contracts/dashboard-api.md
"""
import json

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()
logger = structlog.get_logger()


def _query_scalar(sql: str, params: tuple | None = None):
    import psycopg

    if not settings.database_url:
        raise HTTPException(status_code=503, detail="DATABASE_URL no configurado")
    try:
        with psycopg.connect(settings.database_url) as conn, conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            return row[0] if row else None
    except Exception as exc:  # noqa: BLE001
        logger.error("dashboard.query_error", error=str(exc))
        raise HTTPException(status_code=500, detail="error consultando la base") from exc


@router.get("/dashboard/daily")
def daily_summary() -> dict:
    """Resumen del día (sección hecho): volumen, por grupo, lo más reciente."""
    return _query_scalar("select daily_summary()") or {}


@router.get("/dashboard/chat/{chat_id}")
def chat_detail(chat_id: str) -> list:
    """Detalle de un chat HOY (ventana ET)."""
    return _query_scalar("select daily_chat_detail(%s)", (chat_id,)) or []


# =============================================================================
# DASHBOARD EJECUTIVO "¡Hola Cecilia!" (Producto ②) — datos REALES de la rebanada
# de gestión (migración 0006/0007). Un solo agregado por pantalla.
# =============================================================================


@router.get("/dashboard/executive")
def executive() -> dict:
    """Todo lo que pinta el dashboard ejecutivo en una sola consulta agregada."""
    return _query_scalar("select executive_summary()") or {}


@router.get("/dashboard/search")
def search(q: str = "", tipo: str = "mensajes") -> list:
    """Buscador global sobre mensajes + transcripciones (FR-021), filtrable por tipo."""
    if not q.strip():
        return []
    return _query_scalar("select search_everything(%s, %s)", (q.strip(), tipo)) or []


# ── Bloques de IA: LiteLLM (Gemini) con FALLBACK determinista ────────────────
# Si no hay GEMINI_API_KEY o falla la llamada, se responde con reglas sobre los
# datos reales — la demo nunca se rompe. source indica cuál se usó.


async def _llm_json(system: str, user: str) -> dict | None:
    """Llama al LLM vía LiteLLM y parsea JSON. None si no hay key o falla."""
    if not settings.gemini_api_key:
        return None
    try:
        import litellm  # import diferido: la pila de IA no es necesaria para el resto

        resp = await litellm.acompletion(
            model=settings.llm_model,
            api_key=settings.gemini_api_key,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.3,
        )
        content = resp["choices"][0]["message"]["content"]
        # Gemini a veces envuelve el JSON en ```json … ```
        content = content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(content)
    except Exception as exc:  # noqa: BLE001
        logger.warning("ai.llm_error", error=str(exc))
        return None


def _deterministic_bullets(d: dict) -> list[dict]:
    pulso, pend = d.get("pulso", {}), d.get("pendientes", {})
    grupos, op = d.get("grupos", []), d.get("oportunidades", [])
    out: list[dict] = []
    delta = pulso.get("delta_pct")
    if delta is not None:
        out.append({"tono": "brand",
                    "texto": f"La actividad {'aumentó' if delta >= 0 else 'bajó'} "
                             f"un {abs(delta)}% respecto a ayer."})
    if op:
        out.append({"tono": "ok", "texto": f"Se detectaron {len(op)} oportunidades comerciales."})
    if grupos:
        top = grupos[0]
        total = sum(g.get("mensajes_7d", 0) for g in grupos) or 1
        out.append({"tono": "ok",
                    "texto": f"El grupo {top.get('nombre')} generó el "
                             f"{round(top.get('mensajes_7d', 0) / total * 100)}% de las interacciones."})
    crit = pend.get("criticos", 0)
    if crit:
        out.append({"tono": "warning", "texto": f"Existen {crit} pendientes críticos sin resolver."})
    return out


@router.get("/dashboard/ai/summary")
async def ai_summary() -> dict:
    """Resumen ejecutivo IA. Redacta con el LLM; si no hay key, usa reglas."""
    data = _query_scalar("select executive_summary()") or {}
    bullets = _deterministic_bullets(data)
    facts = json.dumps({k: data.get(k) for k in ("pulso", "pendientes", "grupos", "oportunidades")},
                       ensure_ascii=False)
    llm = await _llm_json(
        "Sos el analista comercial de una líder de seguros. A partir de los datos JSON, "
        "devolvé un resumen ejecutivo del día como JSON: {\"bullets\":[{\"tono\":"
        "\"brand|ok|warning|danger\",\"texto\":\"...\"}]}. 3 a 4 bullets, en español, "
        "concretos y accionables. Solo JSON.",
        facts,
    )
    if llm and isinstance(llm.get("bullets"), list) and llm["bullets"]:
        return {"bullets": llm["bullets"], "source": "ia"}
    return {"bullets": bullets, "source": "reglas"}


class AskBody(BaseModel):
    question: str


@router.post("/dashboard/ai/ask")
async def ai_ask(body: AskBody) -> dict:
    """Preguntale a la IA: responde con el LLM sobre los datos reales del día."""
    data = _query_scalar("select executive_summary()") or {}
    facts = json.dumps(data, ensure_ascii=False, default=str)
    llm = await _llm_json(
        "Sos el asistente de inteligencia comercial de la líder. Respondé la pregunta "
        "USANDO solo los datos JSON provistos. Devolvé JSON: {\"answer\":\"...\"}. "
        "Respuesta breve en español. Si el dato no está, decilo. Solo JSON.",
        f"DATOS:\n{facts}\n\nPREGUNTA: {body.question}",
    )
    if llm and llm.get("answer"):
        return {"answer": llm["answer"], "source": "ia"}
    # Fallback determinista: resumen de los datos + nota honesta.
    p, pend = data.get("pulso", {}), data.get("pendientes", {})
    answer = (
        f"Hoy hubo {p.get('mensajes_hoy', 0)} mensajes en {p.get('grupos_activos', 0)} grupos. "
        f"Hay {pend.get('total', 0)} pendientes abiertos ({pend.get('criticos', 0)} críticos) "
        f"y {len(data.get('oportunidades', []))} oportunidades detectadas. "
        "(Respuesta automática sobre los datos — configurá GEMINI_API_KEY para respuestas con IA.)"
    )
    return {"answer": answer, "source": "reglas"}
