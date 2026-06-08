// Sin `as const`: los valores se ensanchan a `string`, así `en` puede tener otras
// cadenas con la MISMA forma de claves (en.ts se tipa como `typeof es`). El catálogo
// de claves queda fijo; los textos no quedan congelados como literales.
export const es = {
  today: {
    title: "¿Qué pasó hoy?",
    subtitle: "Tu día en WhatsApp, en un vistazo",
    empty: "Hoy no hubo actividad capturada.",
    totalMessages: "Mensajes del día",
    byGroup: "Actividad por grupo",
    latest: "Lo más reciente",
    facts: "Actividad capturada",
    inferred: "Eventos comerciales (IA)",
    inferredHint: "Interpretado por IA — abrí cada uno para ver el mensaje de origen.",
    openSource: "Ver mensaje de origen",
    audioOriginal: "Escuchar audio original",
    // Bloque 1 — Pulso del día
    pulse: "Pulso del día",
    kpiMessages: "mensajes",
    kpiGroups: "grupos activos",
    kpiPending: "pendientes",
    kpiEvents: "eventos",
    // Bloque 2 — Necesita tu atención
    attention: "Necesita tu atención",
    attentionEmpty: "Nada pendiente. Estás al día 🎉",
    attentionWiring: "Conectando con el motor de pendientes…",
    reasonUnanswered: "Consulta/objeción sin responder",
    reasonAgentLast: "Última palabra de un agente, sin respuesta",
    // Bloque 3 — Eventos comerciales
    eventsWiring: "Los eventos comerciales se extraen con IA (próximo paso del backend).",
    // Bloque 4 — Actividad por grupo (usa byGroup)
    // Bloque 5 — Buscador
    search: "Buscar",
    searchPlaceholder: "Buscar en mensajes y transcripciones…",
    searchWiring: "El buscador se conecta al backend en el próximo paso.",
    group: "grupo",
    direct: "1:1",
  },
  eventTypes: {
    venta: "Venta",
    objecion: "Objeción",
    seguimiento: "Seguimiento",
    consulta: "Consulta",
  },
};
