"""Procesamiento de reuniones: de la transcripción → resumen + temas + acciones.

Hoy por REGLAS (funciona offline, sin Gemini): detecta intervenciones, arma un
resumen, junta temas y extrae las frases de compromiso/objetivo como acciones de
seguimiento. Con GEMINI_API_KEY el mismo punto se reemplaza por una extracción con
LLM (mucho mejor) y las reglas quedan de fallback.

La transcripción puede venir pegada (modo demo) o de Zoom (Cloud Recording API,
cuando estén las credenciales — mismo andamiaje que la asistencia).
"""
import re

# Frases que marcan un compromiso/acción/objetivo.
_ACTION_ES = ("hay que", "tenemos que", "queda pendiente", "objetivo", "compromiso", "se acuerda",
              "acordamos", "asignar", "llamar a", "enviar", "mandar", "hacer seguimiento", "seguimiento a",
              "revisar", "coordinar", "preparar", "definir", "agendar", "contactar", "responsable",
              "vamos a", "queda en", "se compromete", "próximo paso", "para la semana")
_ACTION_EN = ("we need to", "we have to", "action item", "objective", "commitment", "agreed",
              "assign", "call ", "send", "follow up", "follow-up", "review", "coordinate", "prepare",
              "define", "schedule", "contact", "responsible", "we will", "next step", "by next week")


def _sentences(text: str) -> list[str]:
    parts = re.split(r"[.\n!?]+", text or "")
    return [s.strip() for s in parts if len(s.strip()) >= 6]


def process_transcript(text: str, lang: str = "es") -> dict:
    en = lang == "en"
    sents = _sentences(text)
    kws = _ACTION_EN if en else _ACTION_ES

    acciones, temas = [], []
    for s in sents:
        low = s.lower()
        if any(k in low for k in kws):
            # limpiar prefijos típicos de transcripción ("Nombre: ...")
            titulo = re.sub(r"^[A-ZÁÉÍÓÚÑ][\wáéíóúñ ]{1,20}:\s*", "", s)[:140]
            if titulo and titulo not in [a["titulo"] for a in acciones]:
                acciones.append({"titulo": titulo[0].upper() + titulo[1:]})
        elif len(s) >= 25 and len(temas) < 5:
            temas.append(s[:140])

    acciones = acciones[:8]
    # Resumen: primeras intervenciones de contexto + conteo de acciones.
    head = " ".join(sents[:2])[:240]
    if en:
        resumen = f"{head}. {len(acciones)} action items identified across {len(sents)} points."
    else:
        resumen = f"{head}. Se identificaron {len(acciones)} acciones de seguimiento en {len(sents)} intervenciones."
    return {"resumen": resumen.strip(), "temas": temas, "acciones": acciones}
