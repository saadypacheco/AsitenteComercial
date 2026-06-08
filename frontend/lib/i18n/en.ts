import type { es } from "./es";

export const en: typeof es = {
  today: {
    title: "What happened today?",
    subtitle: "Your day on WhatsApp, at a glance",
    empty: "No activity was captured today.",
    totalMessages: "Messages today",
    byGroup: "Activity by group",
    latest: "Most recent",
    facts: "Captured activity",
    inferred: "Commercial events (AI)",
    inferredHint: "Inferred by AI — open each one to see the source message.",
    openSource: "View source message",
    audioOriginal: "Play original audio",
    // Block 1 — Day pulse
    pulse: "Day pulse",
    kpiMessages: "messages",
    kpiGroups: "active groups",
    kpiPending: "pending",
    kpiEvents: "events",
    // Block 2 — Needs your attention
    attention: "Needs your attention",
    attentionEmpty: "Nothing pending. You're all caught up 🎉",
    attentionWiring: "Connecting to the pending-items engine…",
    reasonUnanswered: "Unanswered inquiry/objection",
    reasonAgentLast: "Agent had the last word, no reply",
    // Block 3 — Commercial events
    eventsWiring: "Commercial events are extracted with AI (next backend step).",
    // Block 4 — Activity by group (uses byGroup)
    // Block 5 — Search
    search: "Search",
    searchPlaceholder: "Search messages and transcriptions…",
    searchWiring: "Search connects to the backend in the next step.",
    group: "group",
    direct: "1:1",
  },
  eventTypes: {
    venta: "Sale",
    objecion: "Objection",
    seguimiento: "Follow-up",
    consulta: "Inquiry",
  },
} as const;
