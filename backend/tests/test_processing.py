"""Tests del procesamiento US4: clasificación + tipo de evento por reglas."""
from app.services.processing import classify


def test_clasifica_venta():
    c = classify("Cerré la operación con el cliente, póliza firmada 🎉")
    assert c["event_type"] == "venta"


def test_clasifica_objecion_es_critica():
    c = classify("El cliente puso un reclamo, dice que está muy caro")
    assert c["event_type"] == "objecion"
    assert c["importance"] == "red"


def test_clasifica_seguimiento():
    c = classify("Hay que llamar al cliente para agendar la visita")
    assert c["event_type"] == "seguimiento"


def test_clasifica_consulta():
    c = classify("¿Cuánto sale el seguro de vida?")
    assert c["event_type"] == "consulta"


def test_sin_keywords_no_es_evento():
    assert classify("buenos días equipo, arrancamos")["event_type"] is None
    assert classify("")["event_type"] is None
    assert classify(None)["category"] == "otro"
