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
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import require_tenant
from app.core.config import settings

router = APIRouter()
logger = structlog.get_logger()


def _query_scalar(sql: str, params: tuple | None = None):
    from app.db import pool

    try:
        return pool.scalar(sql, params)
    except Exception as exc:  # noqa: BLE001
        logger.error("dashboard.query_error", error=str(exc))
        raise HTTPException(status_code=500, detail="error consultando la base") from exc


@router.get("/dashboard/daily")
def daily_summary(tenant: str = Depends(require_tenant)) -> dict:
    """Resumen del día (sección hecho): volumen, por grupo, lo más reciente."""
    return _query_scalar("select daily_summary(%s)", (tenant,)) or {}


@router.get("/dashboard/chat/{chat_id}")
def chat_detail(chat_id: str, tenant: str = Depends(require_tenant)) -> list:
    """Detalle de un chat HOY (ventana ET)."""
    return _query_scalar("select daily_chat_detail(%s, %s)", (chat_id, tenant)) or []


# =============================================================================
# DASHBOARD EJECUTIVO "¡Hola Cecilia!" (Producto ②) — datos REALES de la rebanada
# de gestión (migración 0006/0007). Un solo agregado por pantalla.
# =============================================================================


@router.get("/dashboard/executive")
def executive(tenant: str = Depends(require_tenant), lang: str = "es") -> dict:
    """Todo lo que pinta el dashboard ejecutivo en una sola consulta agregada."""
    lang = "en" if lang == "en" else "es"
    return _query_scalar("select executive_summary(%s, %s)", (tenant, lang)) or {}


@router.get("/dashboard/search")
def search(q: str = "", tipo: str = "mensajes", tenant: str = Depends(require_tenant)) -> list:
    """Buscador global sobre mensajes + transcripciones (FR-021), filtrable por tipo."""
    if not q.strip():
        return []
    return _query_scalar("select search_everything(%s, %s, %s)", (q.strip(), tipo, tenant)) or []


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


def _deterministic_bullets(d: dict, lang: str = "es") -> list[dict]:
    en = lang == "en"
    pulso, pend = d.get("pulso", {}), d.get("pendientes", {})
    grupos, op = d.get("grupos", []), d.get("oportunidades", [])
    out: list[dict] = []
    delta = pulso.get("delta_pct")
    if delta is not None:
        if en:
            out.append({"tono": "brand",
                        "texto": f"Activity {'rose' if delta >= 0 else 'fell'} {abs(delta)}% vs yesterday."})
        else:
            out.append({"tono": "brand",
                        "texto": f"La actividad {'aumentó' if delta >= 0 else 'bajó'} "
                                 f"un {abs(delta)}% respecto a ayer."})
    if op:
        out.append({"tono": "ok",
                    "texto": f"Detected {len(op)} commercial opportunities." if en
                             else f"Se detectaron {len(op)} oportunidades comerciales."})
    if grupos:
        top = grupos[0]
        total = sum(g.get("mensajes_7d", 0) for g in grupos) or 1
        pct = round(top.get("mensajes_7d", 0) / total * 100)
        out.append({"tono": "ok",
                    "texto": f"Group {top.get('nombre')} generated {pct}% of interactions." if en
                             else f"El grupo {top.get('nombre')} generó el {pct}% de las interacciones."})
    crit = pend.get("criticos", 0)
    if crit:
        out.append({"tono": "warning",
                    "texto": f"There are {crit} unresolved critical pending items." if en
                             else f"Existen {crit} pendientes críticos sin resolver."})
    return out


@router.get("/dashboard/ai/summary")
async def ai_summary(tenant: str = Depends(require_tenant), lang: str = "es") -> dict:
    """Resumen ejecutivo IA. Redacta con el LLM; si no hay key, usa reglas."""
    lang = "en" if lang == "en" else "es"
    data = _query_scalar("select executive_summary(%s, %s)", (tenant, lang)) or {}
    bullets = _deterministic_bullets(data, lang)
    facts = json.dumps({k: data.get(k) for k in ("pulso", "pendientes", "grupos", "oportunidades")},
                       ensure_ascii=False)
    idioma = "English" if lang == "en" else "español"
    llm = await _llm_json(
        f"Sos el analista comercial de una líder de seguros. A partir de los datos JSON, "
        f"devolvé un resumen ejecutivo del día como JSON: {{\"bullets\":[{{\"tono\":"
        f"\"brand|ok|warning|danger\",\"texto\":\"...\"}}]}}. 3 a 4 bullets, EN {idioma}, "
        f"concretos y accionables. Solo JSON.",
        facts,
    )
    if llm and isinstance(llm.get("bullets"), list) and llm["bullets"]:
        return {"bullets": llm["bullets"], "source": "ia"}
    return {"bullets": bullets, "source": "reglas"}


class AskBody(BaseModel):
    question: str


@router.post("/dashboard/ai/ask")
async def ai_ask(body: AskBody, tenant: str = Depends(require_tenant), lang: str = "es") -> dict:
    """Preguntale a la IA: responde con el LLM sobre los datos reales del día."""
    lang = "en" if lang == "en" else "es"
    data = _query_scalar("select executive_summary(%s, %s)", (tenant, lang)) or {}
    facts = json.dumps(data, ensure_ascii=False, default=str)
    idioma = "English" if lang == "en" else "español"
    llm = await _llm_json(
        f"Sos el asistente de inteligencia comercial de la líder. Respondé la pregunta "
        f"USANDO solo los datos JSON provistos. Devolvé JSON: {{\"answer\":\"...\"}}. "
        f"Respuesta breve en {idioma}. Si el dato no está, decilo. Solo JSON.",
        f"DATOS:\n{facts}\n\nPREGUNTA: {body.question}",
    )
    if llm and llm.get("answer"):
        return {"answer": llm["answer"], "source": "ia"}
    # Fallback determinista localizado.
    p, pend = data.get("pulso", {}), data.get("pendientes", {})
    nop = len(data.get("oportunidades", []))
    if lang == "en":
        answer = (
            f"Today there were {p.get('mensajes_hoy', 0)} messages across "
            f"{p.get('grupos_activos', 0)} groups. There are {pend.get('total', 0)} open pending "
            f"items ({pend.get('criticos', 0)} critical) and {nop} detected opportunities. "
            "(Automatic answer over the data — set GEMINI_API_KEY for AI answers.)"
        )
    else:
        answer = (
            f"Hoy hubo {p.get('mensajes_hoy', 0)} mensajes en {p.get('grupos_activos', 0)} grupos. "
            f"Hay {pend.get('total', 0)} pendientes abiertos ({pend.get('criticos', 0)} críticos) "
            f"y {nop} oportunidades detectadas. "
            "(Respuesta automática sobre los datos — configurá GEMINI_API_KEY para respuestas con IA.)"
        )
    return {"answer": answer, "source": "reglas"}
